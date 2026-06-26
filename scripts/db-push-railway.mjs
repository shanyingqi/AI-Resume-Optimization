import { execSync } from "node:child_process";
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

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function parseDatabaseUrl(url) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
  };
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Add it to .env in the project root.");
  process.exit(1);
}

const sql = execSync(
  "npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script",
  { encoding: "utf8" },
);

const config = parseDatabaseUrl(databaseUrl);
const connection = await mysql.createConnection({
  ...config,
  ssl: { rejectUnauthorized: false },
  multipleStatements: true,
});

try {
  const phase2Path = resolve(rootDir, "scripts/phase2-schema.sql");
  const phase2Sql = existsSync(phase2Path)
    ? readFileSync(phase2Path, "utf8")
    : "";

  const statements = [
    ...phase2Sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("--")),
    ...sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean),
  ];

  for (const statement of statements) {
    try {
      await connection.query(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      if (
        message.includes("already exists") ||
        message.includes("Duplicate column") ||
        code === "ER_FK_DUP_NAME" ||
        code === "ER_DUP_KEYNAME" ||
        code === "ER_DUP_FIELDNAME" ||
        code === "ER_KEY_COLUMN_DOES_NOT_EXITS" ||
        code === "ER_CANT_CREATE_TABLE"
      ) {
        console.log("skip:", message.split("\n")[0]);
        continue;
      }
      throw error;
    }
  }

  console.log("Schema pushed to Railway MySQL successfully.");
} finally {
  await connection.end();
}

// 补全可能缺失的列（先查再改，避免无意义 ALTER 卡锁）
console.log("Running column fix...");
await import("node:child_process").then(({ execSync }) => {
  execSync("node scripts/fix-phase2-columns.mjs", { stdio: "inherit", cwd: rootDir });
});
console.log("All done.");
