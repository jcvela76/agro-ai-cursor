/**
 * Baseline Drizzle migration journal when the DB was provisioned with `db:push`
 * before `__drizzle_migrations` was populated.
 *
 * Usage (loads .env.local):
 *   npx tsx scripts/baseline-drizzle-migrations.ts
 *
 * Safe to re-run: skips hashes already recorded.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
import { readMigrationFiles } from "drizzle-orm/migrator";

function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function main(): Promise<void> {
  loadEnvLocal();
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL or DATABASE_URL_UNPOOLED required in .env.local");
  }

  const sql = neon(url);
  const migrations = readMigrationFiles({ migrationsFolder: "./drizzle" });

  const existing = await sql`SELECT hash FROM drizzle.__drizzle_migrations`;
  const known = new Set(existing.map((row: { hash: string }) => row.hash));

  let inserted = 0;
  for (const migration of migrations) {
    if (known.has(migration.hash)) {
      continue;
    }
    await sql`
      INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      VALUES (${migration.hash}, ${migration.folderMillis})
    `;
    inserted += 1;
    console.log(`+ baselined ${migration.hash.slice(0, 12)}… (${migration.folderMillis})`);
  }

  const total = await sql`SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations`;
  console.log(`Done. Inserted ${inserted}; journal now has ${total[0]?.count ?? 0} entries.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
