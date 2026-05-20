-- ============================================================
-- PawMatch — Analytics events table + admin RLS policies
-- Run on: 2026-05-21
-- ============================================================
-- Lightweight engagement tracking. One row per event.
-- Anonymous inserts allowed (session-based); only admins read.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.analytics_events (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name   TEXT NOT NULL,        -- 'page_view','quiz_started','quiz_completed','share_clicked','cta_clicked','waitlist_joined'
    session_id   TEXT NOT NULL,        -- anonymous session UUID from localStorage
    user_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
    page         TEXT,                  -- '/index.html', '/match.html', ...
    properties   JSONB,                 -- {archetype:'cozy', platform:'ig', target:'pets'}
    language     language_code,
    referrer     TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_name_time ON analytics_events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_session   ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_archetype ON analytics_events((properties->>'archetype'))
    WHERE event_name = 'quiz_completed';

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone (anonymous or signed in) can record events
CREATE POLICY "events_insert_anyone" ON analytics_events
    FOR INSERT WITH CHECK (true);

-- Admins read everything
CREATE POLICY "events_select_admin" ON analytics_events
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================
-- Admin read access to existing tables (dashboard queries)
-- ============================================================
CREATE POLICY "waitlist_select_admin" ON waitlist
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "quiz_responses_select_admin" ON quiz_responses
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================
-- One-time: promote yourself to admin (run separately, replace email)
-- ============================================================
-- UPDATE profiles SET role = 'admin' WHERE email = 'proudprasertchai@gmail.com';
