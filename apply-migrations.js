import pkg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { Client } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString =
  "postgresql://postgres:Novmar@2023@db.ijnpmdjxyabudclzudnn.supabase.co:5432/postgres";

async function run() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log("Connected to the database. Running migrations...");

  const migrationsDir = path.join(__dirname, "supabase", "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    console.log(`Applying migration: ${file}`);
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, "utf8");

    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("COMMIT");
      console.log(`Successfully applied: ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`Error applying migration ${file}:`, err);
      process.exit(1);
    }
  }

  console.log("All migrations successfully applied.");
  await client.end();
}

run().catch((err) => {
  console.error("Migration runner failed:", err);
  process.exit(1);
});
