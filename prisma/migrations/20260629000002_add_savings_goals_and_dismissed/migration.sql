CREATE TABLE IF NOT EXISTS savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount DOUBLE PRECISION NOT NULL,
    saved_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    target_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS savings_goals_user_id_idx ON savings_goals(user_id);
CREATE TABLE IF NOT EXISTS dismissed_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fingerprint TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'ADVICE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS dismissed_items_user_id_fingerprint_key ON dismissed_items(user_id, fingerprint);
CREATE INDEX IF NOT EXISTS dismissed_items_user_id_idx ON dismissed_items(user_id);
