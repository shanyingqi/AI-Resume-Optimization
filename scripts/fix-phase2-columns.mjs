import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(rootDir, ".env");

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const parsed = new URL(databaseUrl);
const connection = await mysql.createConnection({
  host: parsed.hostname,
  port: Number(parsed.port || 3306),
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.replace(/^\//, ""),
  ssl: { rejectUnauthorized: false },
  multipleStatements: false,
});

const statements = [
  "ALTER TABLE `users` ADD COLUMN `onboarding_completed` BOOLEAN NOT NULL DEFAULT false",
  "ALTER TABLE `users` ADD COLUMN `password_reset_token` VARCHAR(191) NULL",
  "ALTER TABLE `users` ADD COLUMN `password_reset_expires` DATETIME(3) NULL",
  "ALTER TABLE `optimization_history` ADD COLUMN `title` VARCHAR(191) NULL",
  "ALTER TABLE `optimization_history` ADD COLUMN `deleted_at` DATETIME(3) NULL",
  "ALTER TABLE `optimization_history` ADD COLUMN `project_id` VARCHAR(191) NULL",
  "ALTER TABLE `chat_sessions` ADD COLUMN `history_id` VARCHAR(191) NULL",
  "ALTER TABLE `chat_sessions` ADD COLUMN `project_id` VARCHAR(191) NULL",
];

for (const sql of statements) {
  try {
    await connection.query(sql);
    console.log("ok:", sql.slice(0, 70));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Duplicate column")) {
      console.log("skip:", message.split("\n")[0]);
      continue;
    }
    console.error("fail:", message);
    process.exitCode = 1;
  }
}

await connection.end();
console.log("Column fix finished.");
