import { createHash, randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "./db";

export const allRoles = ["employee", "finance", "gm", "cashier", "hr"] as const;
export type Role = (typeof allRoles)[number];

export class AuthError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly next: string,
  ) {
    super(message);
  }
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
export const SESSION_COOKIE = "ledger_session";

const loginInput = z.object({
  username: z.string().trim().min(1).max(40),
  password: z.string().min(1).max(128),
});

const createUserInput = z.object({
  username: z.string().trim().min(1).max(40),
  displayName: z.string().trim().min(1).max(40),
  password: z.string().min(8).max(128),
  roles: z.array(z.enum(allRoles)).min(1),
});

export type PublicUser = {
  id: string;
  username: string;
  displayName: string;
  roles: Role[];
};

export type AuthUser = PublicUser;

function parseRoles(raw: string): Role[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part): part is Role => (allRoles as readonly string[]).includes(part));
}

function publicUser(user: { id: string; username: string; displayName: string; roles: string }): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    roles: parseRoles(user.roles),
  };
}

function newToken() {
  return createHash("sha256").update(randomBytes(32)).digest("hex");
}

export function userHasRole(user: PublicUser, role: Role) {
  return user.roles.includes(role);
}

export function userHasAnyRole(user: PublicUser, roles: Role[]) {
  return roles.some((role) => user.roles.includes(role));
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function createUser(input: z.input<typeof createUserInput>) {
  const parsed = createUserInput.safeParse(input);
  if (!parsed.success) {
    throw new AuthError(
      "用户字段不合要求。",
      "AUTH_INVALID",
      parsed.error.issues.map((issue) => issue.path.join(".") + " " + issue.message).join("；"),
    );
  }
  const data = parsed.data;
  const username = data.username.toLowerCase();
  const existing = await db.user.findUnique({ where: { username } });
  if (existing) throw new AuthError("用户名已存在。", "AUTH_INVALID", "换一个用户名。");
  const user = await db.user.create({
    data: {
      id: randomUUID(),
      username,
      displayName: data.displayName,
      passwordHash: await hashPassword(data.password),
      roles: data.roles.join(","),
      active: true,
    },
  });
  return publicUser(user);
}

export async function listUsers() {
  const users = await db.user.findMany({ orderBy: { username: "asc" }, take: 200 });
  return users.map((user) => ({ ...publicUser(user), active: user.active }));
}

export async function setUserActive(userId: string, active: boolean) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new AuthError("用户不存在。", "AUTH_INVALID", "核对用户 id。");
  const updated = await db.user.update({
    where: { id: userId },
    data: { active },
  });
  if (!active) await db.session.deleteMany({ where: { userId } });
  return { ...publicUser(updated), active: updated.active };
}

export async function login(input: z.input<typeof loginInput>) {
  const parsed = loginInput.safeParse(input);
  if (!parsed.success) {
    throw new AuthError("请填写用户名和密码。", "AUTH_INVALID", "补全后再试。");
  }
  const username = parsed.data.username.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { username } });
  if (!user || !user.active) {
    throw new AuthError("账号或密码不正确。", "AUTH_INVALID", "核对账号后重试。");
  }
  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) throw new AuthError("账号或密码不正确。", "AUTH_INVALID", "核对账号后重试。");
  const token = newToken();
  await db.session.create({
    data: {
      id: token,
      userId: user.id,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return { token, user: publicUser(user), expiresAt: new Date(Date.now() + SESSION_TTL_MS) };
}

export async function logout(token: string | null | undefined) {
  if (!token) return;
  await db.session.deleteMany({ where: { id: token } });
}

const changePasswordInput = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

export async function changePassword(userId: string, input: z.input<typeof changePasswordInput>) {
  const parsed = changePasswordInput.safeParse(input);
  if (!parsed.success) {
    throw new AuthError(
      "密码字段不合要求。",
      "AUTH_INVALID",
      parsed.error.issues.map((issue) => issue.path.join(".") + " " + issue.message).join("；"),
    );
  }
  if (parsed.data.newPassword === parsed.data.currentPassword) {
    throw new AuthError("新密码不能与当前密码相同。", "AUTH_INVALID", "换一个新密码。");
  }
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) throw new AuthError("账号不可用。", "AUTH_INACTIVE", "联系管理员。");
  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) throw new AuthError("当前密码不正确。", "AUTH_INVALID", "核对后再试。");
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });
  await db.session.deleteMany({ where: { userId } });
}

export async function userFromToken(token: string | null | undefined): Promise<AuthUser | null> {
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await db.session.deleteMany({ where: { id: token } });
    return null;
  }
  if (!session.user.active) return null;
  return publicUser(session.user);
}

export function tokenFromRequest(request: Request): string | null {
  // 显式 Bearer 优先，方便脚本在带 Cookie 的环境里切换账号。
  const auth = request.headers.get("authorization") || "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i);
  if (bearer?.[1]?.trim()) return bearer[1].trim();
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  if (match?.[1]) return decodeURIComponent(match[1]);
  return null;
}

export async function requireUser(request: Request, roles?: Role[]) {
  const user = await userFromToken(tokenFromRequest(request));
  if (!user) throw new AuthError("请先登录。", "AUTH_REQUIRED", "调用 /api/auth/login。");
  if (roles && !userHasAnyRole(user, roles)) {
    throw new AuthError("当前账号没有权限。", "AUTH_FORBIDDEN", `需要角色：${roles.join(" 或 ")}。`);
  }
  return user;
}

export function sessionCookie(token: string, expiresAt: Date) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${expiresAt.toUTCString()}`,
  ];
  return parts.join("; ");
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
