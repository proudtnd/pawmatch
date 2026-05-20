-- ============================================================
-- PawMatch — Waitlist table (MVP launch signal capture)
-- Run on: 2026-05-20
-- ============================================================
-- Captures email signups from the "Coming Soon" pages
-- (pets marketplace, verified breeders, breeder onboarding)
-- so we can sequence the rollout based on real demand.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.waitlist (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       TEXT NOT NULL,
    feature     TEXT NOT NULL CHECK (feature IN ('pets','breeders','breeder_signup')),
    language    language_code NOT NULL DEFAULT 'en',
    source      TEXT,             -- e.g. 'pets.html', 'match.result', 'auth.modal'
    user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_feature ON waitlist(feature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_email   ON waitlist(email);
-- Prevent duplicates per feature
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_unique ON waitlist(lower(email), feature);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can join the waitlist
CREATE POLICY "waitlist_insert_anyone" ON waitlist
    FOR INSERT WITH CHECK (true);

-- Only the email owner (if signed in) can read their own waitlist entries
CREATE POLICY "waitlist_select_self" ON waitlist
    FOR SELECT USING (user_id IS NOT NULL AND user_id = auth.uid());

-- Admins read everything via the service role key (no policy needed; service role bypasses RLS)
