-- USERS
CREATE TABLE IF NOT EXISTS users (
                                     id SERIAL PRIMARY KEY,
                                     google_sub TEXT UNIQUE NOT NULL,
                                     email TEXT NOT NULL,
                                     name TEXT NOT NULL,
                                     picture TEXT,
                                     created_at TIMESTAMPTZ DEFAULT now()
    );

-- PHOTOS
CREATE TABLE IF NOT EXISTS photos (
                                      id SERIAL PRIMARY KEY,
                                      filename TEXT UNIQUE NOT NULL,
                                      uploaded_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    uploaded_at TIMESTAMPTZ DEFAULT now()
    );

-- CLAIMS
CREATE TABLE IF NOT EXISTS claims (
                                      photo_id INTEGER PRIMARY KEY REFERENCES photos(id) ON DELETE CASCADE,
    claimed_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    claimed_at TIMESTAMPTZ DEFAULT now()
    );

-- INDEXES

-- ROLLS (one roll per user per 3-hour window)
CREATE TABLE IF NOT EXISTS rolls (
                                     id SERIAL PRIMARY KEY,
                                     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    window_start TIMESTAMPTZ NOT NULL,
    photo_ids INTEGER[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, window_start)
    );

CREATE INDEX IF NOT EXISTS idx_rolls_user_window
    ON rolls (user_id, window_start);

CREATE INDEX IF NOT EXISTS idx_claims_claimed_by
    ON claims(claimed_by);

CREATE INDEX IF NOT EXISTS idx_claims_user_time
    ON claims (claimed_by, claimed_at DESC);
