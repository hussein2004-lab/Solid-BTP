// Manage the bundled local PostgreSQL (dev only) — start / stop / status.
// Binaries + data live under .localpg/ (gitignored). Port 5433, trust auth.
//   npm run pg:start | npm run pg:stop | npm run pg:status
import { spawnSync } from "child_process";
import path from "path";

const root = process.cwd();
const pgCtl = path.join(root, ".localpg", "pgsql", "bin", "pg_ctl.exe");
const dataDir = path.join(root, ".localpg", "data");
const logFile = path.join(root, ".localpg", "log.txt");

const cmd = process.argv[2] || "status";
const argsByCmd = {
  start: ["-D", dataDir, "-o", "-p 5433", "-l", logFile, "-w", "start"],
  stop: ["-D", dataDir, "-m", "fast", "stop"],
  status: ["-D", dataDir, "status"],
};
const args = argsByCmd[cmd];
if (!args) {
  console.error(`Unknown command "${cmd}". Use start | stop | status.`);
  process.exit(1);
}

const r = spawnSync(pgCtl, args, { stdio: "inherit" });
process.exit(r.status ?? 0);
