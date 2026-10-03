import assert from "node:assert/strict";
import { AuthError, changePassword, createUser, login, logout, userFromToken, userHasRole } from "./auth";

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

  await changePassword(user.id, { currentPassword: "Passw0rd!", newPassword: "Passw0rd!2" });
  assert.equal(await userFromToken(session.token), null);
  const again = await login({ username: user.username, password: "Passw0rd!2" });
  assert.ok(again.token);

  await logout(again.token);
  const gone = await userFromToken(again.token);
  assert.equal(gone, null);

  console.log("auth ok");
}

main();
