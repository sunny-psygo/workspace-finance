import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

async function main() {
  const port = Number(process.env.LEDGER_PG_PORT || 54329);
  const db = new PGlite("./.pglite");
  const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1" });
  await server.start();
  console.log(`postgres listening on 127.0.0.1:${port}`);
  await new Promise(() => undefined);
}

main();
