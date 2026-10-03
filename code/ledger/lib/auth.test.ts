import assert from "node:assert/strict";
import { AuthError, createUser, login, logout, userFromToken, userHasRole } from "./auth";

async function main() {
  const suffix = Date.now().toString(36);
  const user = await createUser({
    username: `auth_${suffix}`,
    displayName: "鉴权测",
    password: "Passw0rd!",
    roles: ["employee", "cashier"],
  });
  assert.equal(user.username, `auth_${suffix}`);
  assert.ok(userHasRole(user, "employee"));
  assert.ok(userHasRole(user, "cashier"));

  await assert.rejects(
    () => login({ username: user.username, password: "wrong" }),
    (error: unknown) => error instanceof AuthError && error.code === "AUTH_INVALID",
  );

  const session = await login({ username: user.username, password: "Passw0rd!" });
  assert.ok(session.token.length > 20);
  const me = await userFromToken(session.token);
  assert.equal(me?.id, user.id);

  await logout(session.token);
  const gone = await userFromToken(session.token);
  assert.equal(gone, null);

  console.log("auth ok");
}

main();
