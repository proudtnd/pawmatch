# PawMatch Database

PostgreSQL schema designed for **Supabase** (uses `auth.users` for authentication). Also runs on plain Postgres if you swap the auth trigger.

## Files

| File | Purpose |
|---|---|
| `schema.sql` | All tables, enums, indexes, triggers, RLS policies. Idempotent within a fresh DB. |
| `seed.sql` | Reference data — 20 dog/cat/small/exotic breeds with bilingual names. |
| `README.md` | This file. |

## Quick start — Supabase (recommended, ~10 min)

1. **Create a project** at https://supabase.com (free tier is fine for dev)
2. Open your project → **SQL Editor** → **New query**
3. Paste contents of `schema.sql` → click **Run**
4. Paste contents of `seed.sql` → click **Run**
5. Go to **Authentication → Providers** and enable:
   - **Email** (always on)
   - **Google** (recommended)
   - **LINE** — not built-in; use a custom OAuth provider (see below)
6. Create **Storage buckets** (Storage → New bucket):
   - `pet-photos` — Public
   - `breeder-photos` — Public
   - `avatars` — Public
   - `pedigree-docs` — Private
   - `health-docs` — Private

That's it — the DB is ready to talk to the frontend.

## Quick start — plain Postgres

```bash
psql -h HOST -U postgres -d pawmatch -f schema.sql
psql -h HOST -U postgres -d pawmatch -f seed.sql
```

Plain Postgres won't have `auth.users` — remove or rewrite the `handle_new_user` trigger and create your own `users` table.

## What's in the schema

**14 tables**

| Table | Purpose |
|---|---|
| `profiles` | Extends `auth.users` with role, name, language, avatar |
| `breeder_profiles` | Farm details for breeder accounts — region, badges, verification status, ratings |
| `breeds` | Reference catalog with bilingual names + traits |
| `pets` | Individual listings — photos, price, status, lifestyle flags |
| `pedigree_records` | Up to 4 generations of ancestry per pet |
| `health_records` | Vaccines, vet checks, DNA, X-rays, microchip |
| `quiz_responses` | AI Pet Persona quiz results (anonymous allowed) |
| `favorites` | User-saved pets |
| `inquiries` | Buyer ↔ breeder threads, one per pet/buyer pair |
| `messages` | Messages within an inquiry |
| `appointments` | Scheduled farm visits |
| `reviews` | Buyer reviews of breeders, with optional breeder response |
| `referrals` | Invite codes with reward tracking |
| `breeder_audits` | 38-point audit records (admin-only) |

**12 ENUMs** keep status fields type-safe — easy filter queries, autocomplete in your IDE.

**Triggers** auto-handle:
- `updated_at` timestamps on all main tables
- Profile creation when a user signs up via Supabase Auth
- Breeder rating recalculation when a review is added/updated/deleted
- Pet favorite count on favorite/unfavorite

**Row-Level Security (RLS)** is enabled on every table. Examples:
- Anyone can read verified breeders + available pets
- Only the breeder can edit their own pets/pedigree/health records
- Inquiry messages are only readable by the buyer and breeder involved
- Anonymous users can take the quiz; signed-in users own their results
- Audit records are admin-only (frontend can't read them via anon key)

## Connecting from the frontend

After running the schema, grab from Supabase → **Settings → API**:
- `Project URL` (e.g. `https://abc.supabase.co`)
- `anon` public key

Add a small client to `scripts/supabase.js`:

```js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const sb = createClient(
  'https://YOUR-PROJECT.supabase.co',
  'eyJ...your-anon-key...'
);
```

Then in your existing code, replace the hardcoded `PETS` array in `pets.html` with:

```js
const { data: pets, error } = await sb
  .from('pets')
  .select('*, breed:breeds(name), breeder:breeder_profiles(farm_name, slug)')
  .eq('status', 'available')
  .order('published_at', { ascending: false });
```

The RLS policies handle access control automatically — no backend code needed for read flows.

## LINE Login (Thailand essential)

Supabase doesn't ship LINE as a built-in provider. Set it up as a **Custom OAuth provider**:

1. Register at https://developers.line.biz/console → create a LINE Login channel
2. Get `Channel ID` and `Channel secret`
3. Supabase → Authentication → Providers → enable **"OIDC"** or use the custom provider docs
4. Callback URL: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`

Or simpler for now: stick with email + Google for v1, add LINE post-launch.

## Storage paths convention

When uploading files via Supabase Storage, use these paths:
```
pet-photos/{breeder_id}/{pet_id}/{filename}.jpg
breeder-photos/{breeder_id}/cover.jpg
breeder-photos/{breeder_id}/gallery/{n}.jpg
avatars/{user_id}/profile.jpg
pedigree-docs/{pet_id}/cert-{generation}.pdf
health-docs/{pet_id}/{record_type}-{date}.pdf
```

Then store the **public URL** in the corresponding `*_url` column.

## Environment variables (frontend)

Create `.env` (gitignored, used at build time if you add a bundler later):

```
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

For the current Tailwind-CDN site, you can inline them in `scripts/supabase.js` since the anon key is safe to expose (RLS protects everything).

## Migration strategy

Once live:
- Never edit `schema.sql` in place — create `migrations/2026_05_19_add_X.sql` files
- Test on a Supabase preview branch first
- Take a backup (Supabase → Database → Backups) before each migration

## Schema changes you'll likely want soon

- `vet_clinics` reference table (currently health_records just stores clinic name as text)
- `payments` and `bookings` tables once you wire up Omise/2C2P
- `notifications` table for in-app alerts
- `breeder_payouts` once breeders are paid through the platform
- `wishlist_alerts` so seekers get notified when a matching pet is listed

## Verifying it works

After applying both files, run these in Supabase SQL Editor:

```sql
-- count breeds
SELECT species, COUNT(*) FROM breeds GROUP BY species;
-- should return 4 rows: cat, dog, exotic, small

-- list enum types
SELECT typname FROM pg_type WHERE typtype = 'e' AND typname LIKE '%type' OR typname LIKE '%status' OR typname LIKE '%role';
-- should list user_role, species_type, sex_type, etc.

-- check RLS is on
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- rowsecurity should be true for every row
```

Then in **Authentication → Users**, click **Add user** and create one. Check that a row appears automatically in `profiles` (auto-trigger). If yes, you're set.
