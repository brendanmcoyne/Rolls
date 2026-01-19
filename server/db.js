import pg from "pg";
import fs from "node:fs";
import path from "node:path";

const { Pool } = pg;

export const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

export async function initDb() {
    const schema = fs.readFileSync(
        path.join(process.cwd(), "schema.sql"),
        "utf8"
    );
    await db.query(schema);
}
