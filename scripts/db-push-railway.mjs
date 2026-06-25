import { execSync } from "node:child_process";
import mysql from "mysql2/promise";

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
  console.error("DATABASE_URL is not set");
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
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    try {
      await connection.query(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      if (
        message.includes("already exists") ||
        code === "ER_FK_DUP_NAME" ||
        code === "ER_DUP_KEYNAME"
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
