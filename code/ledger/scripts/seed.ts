import { createUser } from "../lib/auth";
import { db } from "../lib/db";

const seeds = [
  { username: "zhangsan", displayName: "张三", password: "Passw0rd!", roles: ["employee"] as const },
  { username: "finance", displayName: "财务李", password: "Passw0rd!", roles: ["finance"] as const },
  { username: "gm", displayName: "总经理王", password: "Passw0rd!", roles: ["gm"] as const },
  { username: "cashier", displayName: "出纳赵", password: "Passw0rd!", roles: ["cashier"] as const },
];

async function main() {
  for (const seed of seeds) {
    const existing = await db.user.findUnique({ where: { username: seed.username } });
    if (existing) {
      console.log("skip", seed.username);
      continue;
    }
    const user = await createUser({ ...seed, roles: [...seed.roles] });
    console.log("created", user.username, user.roles.join(","));
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
