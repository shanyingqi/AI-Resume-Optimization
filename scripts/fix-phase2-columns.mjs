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
  connectTimeout: 20000,
});

async function tableExists(table) {
  const [rows] = await connection.query("SHOW TABLES LIKE ?", [table]);
  return rows.length > 0;
}

async function columnExists(table, column) {
  const [rows] = await connection.query("SHOW COLUMNS FROM ?? LIKE ?", [
    table,
    column,
  ]);
  return rows.length > 0;
}

async function ensureColumn(table, column, definition) {
  if (await columnExists(table, column)) {
    console.log(`skip: ${table}.${column} already exists`);
    return;
  }

  const sql = `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`;
  try {
    await connection.query("SET SESSION innodb_lock_wait_timeout = 15");
    await connection.query(sql);
    console.log("ok:", sql.slice(0, 80));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Duplicate column")) {
      console.log("skip:", message.split("\n")[0]);
      return;
    }
    throw error;
  }
}

async function ensureOptimizeDraftsTable() {
  if (await tableExists("optimize_drafts")) {
    await ensureColumn("optimize_drafts", "cleared", "BOOLEAN NOT NULL DEFAULT false");
    return;
  }

  console.log("creating optimize_drafts table...");
  await connection.query(`
    CREATE TABLE \`optimize_drafts\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`user_id\` VARCHAR(191) NOT NULL,
      \`resume\` LONGTEXT NOT NULL,
      \`job_description\` LONGTEXT NOT NULL,
      \`mode\` VARCHAR(191) NOT NULL DEFAULT 'general',
      \`input_tab\` VARCHAR(191) NOT NULL DEFAULT 'upload',
      \`cleared\` BOOLEAN NOT NULL DEFAULT false,
      \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE INDEX \`optimize_drafts_user_id_key\`(\`user_id\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  try {
    await connection.query(`
      ALTER TABLE \`optimize_drafts\`
      ADD CONSTRAINT \`optimize_drafts_user_id_fkey\`
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`)
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Duplicate") && !message.includes("already exists")) {
      throw error;
    }
    console.log("skip: optimize_drafts foreign key already exists");
  }

  console.log("ok: optimize_drafts table ready");
}

try {
  console.log("Checking phase-2 columns (skip if already present)...");

  await ensureColumn(
    "users",
    "onboarding_completed",
    "BOOLEAN NOT NULL DEFAULT false",
  );
  await ensureColumn("users", "password_reset_token", "VARCHAR(191) NULL");
  await ensureColumn("users", "password_reset_expires", "DATETIME(3) NULL");
  await ensureColumn("optimization_history", "title", "VARCHAR(191) NULL");
  await ensureColumn("optimization_history", "deleted_at", "DATETIME(3) NULL");
  await ensureColumn("optimization_history", "project_id", "VARCHAR(191) NULL");
  await ensureColumn("chat_sessions", "history_id", "VARCHAR(191) NULL");
  await ensureColumn("chat_sessions", "project_id", "VARCHAR(191) NULL");

  await ensureOptimizeDraftsTable();

  console.log("Column fix finished.");
} finally {
  await connection.end();
}
