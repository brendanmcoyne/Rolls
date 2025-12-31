import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export const db = new Database(path.join(process.cwd(), "app.db"));

export function initDb() {
    const schema = fs.readFileSync(path.join(process.cwd(), "schema.sql"), "utf8");
    db.exec(schema);
}