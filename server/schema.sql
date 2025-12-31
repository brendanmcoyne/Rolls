PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                     google_sub TEXT NOT NULL UNIQUE,
                                     email TEXT NOT NULL,
                                     name TEXT NOT NULL,
                                     picture TEXT,
                                     created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

CREATE TABLE IF NOT EXISTS photos (
                                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                                      filename TEXT NOT NULL,
                                      uploaded_by INTEGER NOT NULL,
                                      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS claims (
                                      photo_id INTEGER PRIMARY KEY,
                                      claimed_by INTEGER NOT NULL,
                                      claimed_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
    FOREIGN KEY (claimed_by) REFERENCES users(id) ON DELETE CASCADE
    );
