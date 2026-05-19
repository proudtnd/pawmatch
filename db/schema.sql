-- ============================================================
-- PawMatch — Database Schema v1
-- Target: Supabase Postgres (uses auth.users for authentication)
-- Apply: paste into Supabase → SQL Editor → Run
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- fuzzy search
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE user_role            AS ENUM ('seeker','breeder','admin');
CREATE TYPE language_code        AS ENUM ('en','th');
CREATE TYPE species_type         AS ENUM ('dog','cat','small','exotic');
CREATE TYPE sex_type             AS ENUM ('male','female');
CREATE TYPE pet_status           AS ENUM ('available','reserved','sold','unavailable');
CREATE TYPE verification_status  AS ENUM ('pending','in_review','verified','suspended','rejected');
CREATE TYPE inquiry_status       AS ENUM ('open','scheduled','meeting_done','closed','cancelled');
CREATE TYPE appointment_status   AS ENUM ('scheduled','confirmed','completed','cancelled','no_show');
CREATE TYPE archetype_type       AS ENUM ('cozy','adventurer','social','guardian','freespirit','nurturer');
CREATE TYPE health_record_type   AS ENUM ('vaccine','vet_check','dna_test','xray','microchip','other');
CREATE TYPE region_type          AS ENUM ('bkk','north','south','central','east','west','northeast');
CREATE TYPE referral_status      AS ENUM ('pending','claimed','expired');

-- ============================================================
-- PROFILES — extends auth.users
-- ============================================================
CREATE TABLE public.profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           TEXT UNIQUE NOT NULL,
    full_name       TEXT NOT NULL,
    phone           TEXT,
    avatar_url      TEXT,
    role            user_role NOT NULL DEFAULT 'seeker',
    language        language_code NOT NULL DEFAULT 'en',
    bio             TEXT,
    onboarded_at    TIMESTAMPTZ,
    last_active_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_role  ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

-- ============================================================
-- BREEDS — reference table
-- ============================================================
CREATE TABLE public.breeds (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug                TEXT UNIQUE NOT NULL,
    species             species_type NOT NULL,
    name                JSONB NOT NULL,    -- {"en":"Golden Retriever","th":"โกลเด้น รีทรีฟเวอร์"}
    origin              TEXT,
    avg_lifespan_years  INT,
    avg_weight_kg       NUMERIC(5,2),
    avg_size            TEXT,
    temperament_tags    TEXT[],
    care_difficulty     INT CHECK (care_difficulty BETWEEN 1 AND 5),
    hypoallergenic      BOOLEAN NOT NULL DEFAULT false,
    energy_level        INT NOT NULL DEFAULT 2 CHECK (energy_level BETWEEN 1 AND 3),
    apartment_friendly  BOOLEAN NOT NULL DEFAULT false,
    kid_friendly        BOOLEAN NOT NULL DEFAULT true,
    photo_url           TEXT,
    description         JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_breeds_species ON breeds(species);
CREATE INDEX idx_breeds_name_gin ON breeds USING gin (name);

-- ============================================================
-- BREEDER_PROFILES — extends profiles where role=breeder
-- ============================================================
CREATE TABLE public.breeder_profiles (
    user_id              UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    farm_name            TEXT NOT NULL,
    farm_name_th         TEXT,
    slug                 TEXT UNIQUE NOT NULL,
    region               region_type NOT NULL,
    province             TEXT NOT NULL,
    address              TEXT,
    latitude             NUMERIC(10,7),
    longitude            NUMERIC(10,7),
    years_active         INT,
    established_year     INT,
    specialty_species    species_type[] NOT NULL DEFAULT '{}',
    specialty_breed_ids  UUID[] NOT NULL DEFAULT '{}',
    description          JSONB,
    cover_photo_url      TEXT,
    gallery_photos       TEXT[] NOT NULL DEFAULT '{}',
    verification_status  verification_status NOT NULL DEFAULT 'pending',
    verification_score   INT,
    badges               TEXT[] NOT NULL DEFAULT '{}',    -- ['top','tkc','dna','welfare','heritage']
    last_audit_at        TIMESTAMPTZ,
    next_audit_due_at    TIMESTAMPTZ,
    rating_avg           NUMERIC(3,2),
    review_count         INT NOT NULL DEFAULT 0,
    contact_phone        TEXT,
    contact_line_id      TEXT,
    contact_email        TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_breeder_region            ON breeder_profiles(region);
CREATE INDEX idx_breeder_status            ON breeder_profiles(verification_status);
CREATE INDEX idx_breeder_rating            ON breeder_profiles(rating_avg DESC NULLS LAST);
CREATE INDEX idx_breeder_specialty_species ON breeder_profiles USING gin (specialty_species);
CREATE INDEX idx_breeder_badges            ON breeder_profiles USING gin (badges);

-- ============================================================
-- PETS — individual listings
-- ============================================================
CREATE TABLE public.pets (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    breeder_id           UUID NOT NULL REFERENCES breeder_profiles(user_id) ON DELETE CASCADE,
    breed_id             UUID REFERENCES breeds(id) ON DELETE SET NULL,
    name                 TEXT NOT NULL,
    sex                  sex_type NOT NULL,
    date_of_birth        DATE NOT NULL,
    color                TEXT,
    weight_kg            NUMERIC(5,2),
    price                NUMERIC(10,2) NOT NULL,
    currency             TEXT NOT NULL DEFAULT 'THB',
    status               pet_status NOT NULL DEFAULT 'available',
    energy_level         INT CHECK (energy_level BETWEEN 1 AND 3),
    kid_friendly         BOOLEAN NOT NULL DEFAULT true,
    apartment_friendly   BOOLEAN NOT NULL DEFAULT false,
    hypoallergenic       BOOLEAN NOT NULL DEFAULT false,
    description          JSONB,
    traits               JSONB,
    hero_photo_url       TEXT NOT NULL,
    gallery_urls         TEXT[] NOT NULL DEFAULT '{}',
    video_url            TEXT,
    view_count           INT NOT NULL DEFAULT 0,
    favorite_count       INT NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at         TIMESTAMPTZ
);
CREATE INDEX idx_pets_breeder    ON pets(breeder_id);
CREATE INDEX idx_pets_status     ON pets(status) WHERE status = 'available';
CREATE INDEX idx_pets_breed      ON pets(breed_id);
CREATE INDEX idx_pets_price      ON pets(price);
CREATE INDEX idx_pets_published  ON pets(published_at DESC NULLS LAST);

-- ============================================================
-- PEDIGREE — up to 4 generations
-- ============================================================
CREATE TABLE public.pedigree_records (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id            UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    generation        INT NOT NULL CHECK (generation BETWEEN 1 AND 4),
    relation          TEXT NOT NULL,    -- 'self','sire','dam','gsire_paternal','ggsire_1',...
    ancestor_name     TEXT NOT NULL,
    registration_no   TEXT,
    breed_id          UUID REFERENCES breeds(id),
    photo_url         TEXT,
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pedigree_pet ON pedigree_records(pet_id);
CREATE UNIQUE INDEX idx_pedigree_pet_relation ON pedigree_records(pet_id, relation);

-- ============================================================
-- HEALTH RECORDS
-- ============================================================
CREATE TABLE public.health_records (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    record_type     health_record_type NOT NULL,
    record_date     DATE NOT NULL,
    vet_clinic_name TEXT,
    document_url    TEXT,
    notes           TEXT,
    expires_at      DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_health_pet  ON health_records(pet_id);
CREATE INDEX idx_health_type ON health_records(record_type);
CREATE INDEX idx_health_date ON health_records(record_date DESC);

-- ============================================================
-- QUIZ RESPONSES (anonymous allowed)
-- ============================================================
CREATE TABLE public.quiz_responses (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                UUID REFERENCES profiles(id) ON DELETE SET NULL,
    session_id             TEXT,                  -- for anonymous tracking
    answers                JSONB NOT NULL,        -- {home:'condo',energy:'medium',...}
    archetype              archetype_type NOT NULL,
    type_scores            JSONB NOT NULL,        -- {dog:95,cat:70,small:40,exotic:25}
    recommended_breed_ids  UUID[],
    completed_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    shared_at              TIMESTAMPTZ
);
CREATE INDEX idx_quiz_user      ON quiz_responses(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_quiz_archetype ON quiz_responses(archetype);
CREATE INDEX idx_quiz_completed ON quiz_responses(completed_at DESC);

-- ============================================================
-- FAVORITES
-- ============================================================
CREATE TABLE public.favorites (
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    pet_id      UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, pet_id)
);
CREATE INDEX idx_favorites_user ON favorites(user_id, created_at DESC);
CREATE INDEX idx_favorites_pet  ON favorites(pet_id);

-- ============================================================
-- INQUIRIES (buyer ↔ breeder threads)
-- ============================================================
CREATE TABLE public.inquiries (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id           UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    seeker_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    breeder_id       UUID NOT NULL REFERENCES breeder_profiles(user_id) ON DELETE CASCADE,
    status           inquiry_status NOT NULL DEFAULT 'open',
    last_message_at  TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inquiries_seeker  ON inquiries(seeker_id, updated_at DESC);
CREATE INDEX idx_inquiries_breeder ON inquiries(breeder_id, updated_at DESC);
CREATE INDEX idx_inquiries_pet     ON inquiries(pet_id);
CREATE UNIQUE INDEX idx_inquiries_unique ON inquiries(pet_id, seeker_id);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE public.messages (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inquiry_id   UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
    sender_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    body         TEXT NOT NULL,
    attachments  TEXT[],
    read_at      TIMESTAMPTZ,
    sent_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_inquiry ON messages(inquiry_id, sent_at);
CREATE INDEX idx_messages_unread  ON messages(inquiry_id, sender_id) WHERE read_at IS NULL;

-- ============================================================
-- APPOINTMENTS
-- ============================================================
CREATE TABLE public.appointments (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inquiry_id        UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
    scheduled_at      TIMESTAMPTZ NOT NULL,
    duration_min      INT NOT NULL DEFAULT 60,
    location          TEXT NOT NULL,
    status            appointment_status NOT NULL DEFAULT 'scheduled',
    notes             TEXT,
    reminder_sent_at  TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_appts_inquiry   ON appointments(inquiry_id);
CREATE INDEX idx_appts_scheduled ON appointments(scheduled_at) WHERE status IN ('scheduled','confirmed');

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE public.reviews (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    breeder_id            UUID NOT NULL REFERENCES breeder_profiles(user_id) ON DELETE CASCADE,
    reviewer_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    pet_id                UUID REFERENCES pets(id) ON DELETE SET NULL,
    rating                INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title                 TEXT,
    body                  TEXT,
    photos                TEXT[],
    verified_purchase     BOOLEAN NOT NULL DEFAULT false,
    helpful_count         INT NOT NULL DEFAULT 0,
    breeder_response      TEXT,
    breeder_responded_at  TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_breeder   ON reviews(breeder_id, created_at DESC);
CREATE INDEX idx_reviews_reviewer  ON reviews(reviewer_id);
CREATE UNIQUE INDEX idx_reviews_unique ON reviews(breeder_id, reviewer_id, COALESCE(pet_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ============================================================
-- REFERRALS
-- ============================================================
CREATE TABLE public.referrals (
    code               TEXT PRIMARY KEY,
    inviter_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    invitee_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status             referral_status NOT NULL DEFAULT 'pending',
    reward_amount_thb  INT NOT NULL DEFAULT 200,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    claimed_at         TIMESTAMPTZ,
    expires_at         TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days')
);
CREATE INDEX idx_referrals_inviter ON referrals(inviter_id);
CREATE INDEX idx_referrals_invitee ON referrals(invitee_id) WHERE invitee_id IS NOT NULL;

-- ============================================================
-- BREEDER AUDITS (38-point system)
-- ============================================================
CREATE TABLE public.breeder_audits (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    breeder_id        UUID NOT NULL REFERENCES breeder_profiles(user_id) ON DELETE CASCADE,
    auditor_id        UUID REFERENCES profiles(id),
    audit_date        DATE NOT NULL,
    total_score       INT NOT NULL CHECK (total_score BETWEEN 0 AND 38),
    sections          JSONB NOT NULL,    -- {facilities:{score:8,max:10,notes:''},...}
    overall_notes     TEXT,
    photos            TEXT[],
    document_url      TEXT,
    passed            BOOLEAN NOT NULL,
    next_audit_due    DATE NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audits_breeder ON breeder_audits(breeder_id, audit_date DESC);

-- ============================================================
-- TRIGGERS — auto-updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated         BEFORE UPDATE ON profiles         FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER trg_breeder_profiles_updated BEFORE UPDATE ON breeder_profiles FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER trg_pets_updated             BEFORE UPDATE ON pets             FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER trg_inquiries_updated        BEFORE UPDATE ON inquiries        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER trg_appts_updated            BEFORE UPDATE ON appointments     FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- TRIGGER — auto-create profile when auth user signs up
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, language)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'seeker'),
        COALESCE((NEW.raw_user_meta_data->>'language')::language_code, 'en')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TRIGGER — auto-update breeder rating on review change
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_breeder_rating()
RETURNS TRIGGER AS $$
DECLARE
    target_breeder UUID;
BEGIN
    target_breeder := COALESCE(NEW.breeder_id, OLD.breeder_id);
    UPDATE breeder_profiles SET
        rating_avg   = (SELECT AVG(rating)::NUMERIC(3,2) FROM reviews WHERE breeder_id = target_breeder),
        review_count = (SELECT COUNT(*) FROM reviews WHERE breeder_id = target_breeder)
    WHERE user_id = target_breeder;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_review_changed
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_breeder_rating();

-- ============================================================
-- TRIGGER — favorite count on pet
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_favorite_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE pets SET favorite_count = favorite_count + 1 WHERE id = NEW.pet_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE pets SET favorite_count = GREATEST(favorite_count - 1, 0) WHERE id = OLD.pet_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_favorite_changed
    AFTER INSERT OR DELETE ON favorites
    FOR EACH ROW EXECUTE FUNCTION public.update_favorite_count();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE breeder_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE breeds            ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedigree_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_responses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites         ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews           ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE breeder_audits    ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE USING (auth.uid() = id);

-- BREEDS — public reference
CREATE POLICY "breeds_select_all" ON breeds FOR SELECT USING (true);

-- BREEDER_PROFILES
CREATE POLICY "breeders_select_verified_or_self" ON breeder_profiles FOR SELECT
    USING (verification_status = 'verified' OR user_id = auth.uid());
CREATE POLICY "breeders_insert_self" ON breeder_profiles FOR INSERT
    WITH CHECK (user_id = auth.uid());
CREATE POLICY "breeders_update_self" ON breeder_profiles FOR UPDATE
    USING (user_id = auth.uid());

-- PETS
CREATE POLICY "pets_select_public" ON pets FOR SELECT
    USING (
        (status IN ('available','reserved')
         AND EXISTS (SELECT 1 FROM breeder_profiles bp WHERE bp.user_id = pets.breeder_id AND bp.verification_status = 'verified'))
        OR breeder_id = auth.uid()
    );
CREATE POLICY "pets_breeder_all" ON pets FOR ALL
    USING (breeder_id = auth.uid())
    WITH CHECK (breeder_id = auth.uid());

-- PEDIGREE
CREATE POLICY "pedigree_select_public" ON pedigree_records FOR SELECT
    USING (EXISTS (SELECT 1 FROM pets p WHERE p.id = pedigree_records.pet_id AND p.status IN ('available','reserved')));
CREATE POLICY "pedigree_breeder_all" ON pedigree_records FOR ALL
    USING (EXISTS (SELECT 1 FROM pets p WHERE p.id = pedigree_records.pet_id AND p.breeder_id = auth.uid()));

-- HEALTH
CREATE POLICY "health_select_public" ON health_records FOR SELECT
    USING (EXISTS (SELECT 1 FROM pets p WHERE p.id = health_records.pet_id AND p.status IN ('available','reserved')));
CREATE POLICY "health_breeder_all" ON health_records FOR ALL
    USING (EXISTS (SELECT 1 FROM pets p WHERE p.id = health_records.pet_id AND p.breeder_id = auth.uid()));

-- QUIZ
CREATE POLICY "quiz_select_self_or_anon" ON quiz_responses FOR SELECT
    USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "quiz_insert_anyone" ON quiz_responses FOR INSERT WITH CHECK (true);

-- FAVORITES
CREATE POLICY "favorites_self" ON favorites FOR ALL
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- INQUIRIES
CREATE POLICY "inquiries_participants_select" ON inquiries FOR SELECT
    USING (seeker_id = auth.uid() OR breeder_id = auth.uid());
CREATE POLICY "inquiries_seeker_insert" ON inquiries FOR INSERT
    WITH CHECK (seeker_id = auth.uid());
CREATE POLICY "inquiries_participants_update" ON inquiries FOR UPDATE
    USING (seeker_id = auth.uid() OR breeder_id = auth.uid());

-- MESSAGES
CREATE POLICY "messages_participants_select" ON messages FOR SELECT
    USING (EXISTS (SELECT 1 FROM inquiries i WHERE i.id = messages.inquiry_id AND (i.seeker_id = auth.uid() OR i.breeder_id = auth.uid())));
CREATE POLICY "messages_send" ON messages FOR INSERT
    WITH CHECK (sender_id = auth.uid()
                AND EXISTS (SELECT 1 FROM inquiries i WHERE i.id = inquiry_id AND (i.seeker_id = auth.uid() OR i.breeder_id = auth.uid())));
CREATE POLICY "messages_mark_read" ON messages FOR UPDATE
    USING (EXISTS (SELECT 1 FROM inquiries i WHERE i.id = messages.inquiry_id AND (i.seeker_id = auth.uid() OR i.breeder_id = auth.uid())));

-- APPOINTMENTS
CREATE POLICY "appts_participants_select" ON appointments FOR SELECT
    USING (EXISTS (SELECT 1 FROM inquiries i WHERE i.id = appointments.inquiry_id AND (i.seeker_id = auth.uid() OR i.breeder_id = auth.uid())));
CREATE POLICY "appts_participants_modify" ON appointments FOR ALL
    USING (EXISTS (SELECT 1 FROM inquiries i WHERE i.id = appointments.inquiry_id AND (i.seeker_id = auth.uid() OR i.breeder_id = auth.uid())));

-- REVIEWS
CREATE POLICY "reviews_select_all" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_self" ON reviews FOR INSERT WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "reviews_update_self_or_breeder_response" ON reviews FOR UPDATE
    USING (reviewer_id = auth.uid() OR breeder_id = auth.uid());

-- REFERRALS
CREATE POLICY "referrals_self_select" ON referrals FOR SELECT
    USING (inviter_id = auth.uid() OR invitee_id = auth.uid());
CREATE POLICY "referrals_inviter_insert" ON referrals FOR INSERT
    WITH CHECK (inviter_id = auth.uid());

-- AUDITS — admin/auditor only via service role; no public policy

-- ============================================================
-- Done. Apply seed.sql next.
-- ============================================================
