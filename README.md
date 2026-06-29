# Bukano

Multi-tenant appointment-booking SaaS for small local businesses in North Macedonia and the
Balkans (barbers, salons, clinics, therapists, etc.). Business owners sign up, configure their
business, and get a public booking page at `/b/{slug}`; their clients book without ever creating
an account.

Monorepo layout:

```
backend/    Flask + SQLAlchemy + Alembic API
frontend/   React + Vite + TypeScript SPA
docker-compose.yml   Postgres for local/dev parity with prod
```

## Status

**All 8 milestones complete.** See Roadmap below for the detailed breakdown of each.

Milestone 7 added multi-staff support (each staff member has their own independent services, prices,
and working hours; every business gets one staff member automatically so single-operator businesses
see no change), a self-service PIN portal staff use to manage their own services/hours/appointments,
a separate owner PIN + "who's working" gate for shared devices, and full owner control over
appointments (manual walk-in/phone bookings, moving/cancelling at will with an optional
client-notification message). Milestone 8 added a subscription paywall — every plan (Basic/Mid/Top)
requires payment, enforced server-side (staff limits, real channels, branding, auto-notify), fully
testable today via a dev stub billing provider with no Paddle account needed; going live with real
payments needs your own Paddle account (see the Milestone 8 section for exact steps).

Since then, a security/completeness pass added: real password reset (email-based, not the old
console-log stub), a welcome email on registration, booking-confirmation messages to clients,
login lockout after repeated failed attempts, a minimal platform-admin overview (MRR, churn,
business counts — `flask create-admin`), "copy services from another staff member" when adding
staff, and a first round of frontend tests (Vitest).

A reminder job (in-process scheduler in dev, or a `flask send-reminders` CLI command for production
cron) sends a reminder through each business's preferred channel for confirmed appointments
approaching their configured lead time. A `flask seed` command creates five demo businesses (barber,
hair salon, dental, therapy, personal trainer) spanning all three vocab styles, each with services,
working hours, and a few sample appointments, so you can explore the dashboard without registering by
hand. MK and EN translations are fully in sync (276 keys each, no drift). 128 backend tests pass,
plus 18 frontend tests.

## Prerequisites

- Python 3.12 (3.10+ also works for now; this repo avoids 3.12-only syntax)
- Node.js 20 LTS+
- Docker (only needed if you want Postgres instead of the SQLite default)

## Backend setup

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # Windows; use `source .venv/bin/activate` on macOS/Linux
pip install -r requirements-dev.txt
cp .env.example .env           # defaults to SQLite, no further changes needed for dev
flask --app wsgi.py db upgrade # applies migrations (none yet beyond the empty baseline)
python wsgi.py                 # serves on http://localhost:5000
```

Run tests and lint:

```bash
pytest
ruff check .
black --check .
```

### Using Postgres instead of SQLite

```bash
docker-compose up -d postgres
```

Then in `backend/.env`, uncomment/set:

```
DATABASE_URL=postgresql+psycopg2://maceda:maceda@localhost:5432/maceda_booking
```

and re-run `flask --app wsgi.py db upgrade`.

### Seeding demo data

```bash
flask --app wsgi.py seed
```

Creates five demo businesses (barber, hair salon, dental, therapy/counseling, personal trainer),
each with default services, working hours, two clients, and three appointments (one past, one
upcoming and due for a reminder, one pending). Prints each business's public slug and the shared
owner login password (`password123`) — log in with the email shown for each (e.g.
`owner-barber@example.com`) to explore the dashboard immediately. Safe to re-run — it skips
businesses that already exist by name.

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env            # defaults already point at http://localhost:5000
npm run dev                     # serves on http://localhost:5173
```

Lint, typecheck, test, and build:

```bash
npm run lint
npm run test    # Vitest -- pure logic (lib/) + a component test, not full E2E coverage
npm run build   # runs `tsc -b` then `vite build`
```

### Platform admin (cross-business overview)

There's a minimal `/admin` page (no nav link — it's an ops view, not a product surface) showing
total businesses, MRR, subscription status breakdown, and the most recently registered businesses.
Nobody has access by default; grant it explicitly:

```bash
flask --app wsgi.py create-admin owner@example.com
```

Then log in as that user and visit `/admin` in the browser (or `GET /admin/overview` directly) — any
other user gets a 403.

### Email

Leave `SMTP_HOST` unset in dev: `email_sender.py` falls back to a stub that logs to the console
instead of sending anything (welcome emails, password-reset links), same idea as the SMS/billing
stubs. Set `SMTP_HOST`/`SMTP_PORT`/`SMTP_USERNAME`/`SMTP_PASSWORD`/`SMTP_FROM_EMAIL` to any
provider's SMTP relay (Gmail, SendGrid, Mailgun, Postmark, SES) to send real email. `FRONTEND_URL`
controls what domain the password-reset link points at.

## Verifying the stack end-to-end

### Reminders (Milestone 6)

1. Run `flask --app wsgi.py seed` (see above) — it plants an appointment 20 hours out, which is
   inside the default 1440-minute (24h) reminder lead time.
2. Start the backend with `python wsgi.py`. The in-process scheduler checks for due reminders
   every minute (`REMINDER_INTERVAL_MINUTES`); watch the terminal for
   `[reminders] sent N reminder(s)` followed by a `[stub-notifier] -> ...` line with the message.
3. Prefer to trigger it on demand instead of waiting? Run `flask --app wsgi.py send-reminders` in
   a second terminal — it's the same code path the scheduler uses, exposed as a one-shot CLI
   command (this is also what you'd put in an external cron job in production; see Deployment).
4. Toggle **Enable reminders** off for a business in the dashboard Settings page and re-run — it's
   skipped.

### Dashboard (Milestone 5)

1. Start the backend (`python wsgi.py`, port 5000) and run migrations first if you haven't:
   `flask --app wsgi.py db upgrade`.
2. Start the frontend (`npm run dev`, port 5173).
3. Register a business and walk through onboarding (see below) — on the "you're live" screen,
   click **Go to dashboard** instead of just viewing the public link. (Or log in with one of the
   seeded demo accounts above to skip straight to a populated dashboard.)
4. **Agenda**: book a couple of appointments from the public page in another tab first (see the
   public booking steps below), then approve/cancel them from the agenda, filtering by status and
   date range.
5. **Services**: same editable list as onboarding, just without a "next" step — add, rename, or
   delete services and it saves on blur.
6. **Clients**: approve a pending client, or add one manually (useful for pre-approving a regular
   before they ever book).
7. **Branding**: upload a logo and a cover photo — both are downscaled client-side (logo to 240px,
   cover to 1200px) before upload, then served back from `/uploads/{business_id}/...`. Pick an
   accent colour and tagline and save.
8. **Settings**: change the booking mode, verification channel, daily SMS cap, slug, currency, or
   locale — all in one place now, instead of only through the onboarding flow.

### Public booking + verification (Milestones 3-4)

1. Open the public link (`http://localhost:5173/b/{slug}`). Pick a service, a day/slot, and enter
   a name and MK mobile number (`070 123 456` format).
2. If the business has **require code verification** on, you land on a verification screen with a
   yellow **dev mode — code: XXXXXX** banner (no Twilio keys needed) — type it in to confirm. Try
   **"Use Viber instead" / "Use WhatsApp instead"** to resend via another channel, or **"Continue
   without verification"**, which always books as `pending` regardless of booking mode.
3. Watch the backend terminal: every send is logged (`[stub-notifier] -> ...` or
   `[viber-notifier:stub] -> ...`).
4. With **open** mode you'll see "Booking confirmed!" immediately; **approved_clients** /
   **approve_every** show "Request received" until approved from the dashboard agenda.
5. Try booking the same slot twice — the second attempt is rejected (`409 slot_unavailable`),
   enforced by a partial unique index on `(business_id, starts_at)` for non-cancelled appointments.

**Abuse controls in place:** a code can only be requested for a real service + an actually open
slot; sends are rate-limited per phone (1/60s, 5/day) and per IP (1/60s), plus a per-business daily
cap (`daily_sms_cap`, configurable per business in Settings); a hidden honeypot field silently
rejects bot submissions; Cloudflare Turnstile is checked on both `verify/start` and `book` but is
fully skipped in dev when `TURNSTILE_SECRET_KEY` / `VITE_TURNSTILE_SITE_KEY` are unset (the default).

**Note on Viber:** Twilio has no Viber Business Messages product, so `ViberNotifier` is a
placeholder that behaves like the dev stub until a real provider (e.g. Infobip) is chosen.

### Onboarding (Milestone 2)

1. Click **Register your business**, creating the account and business in one step (with sensible
   default working hours: Mon–Sat 09:00–17:00/14:00 Saturday, Sunday closed).
2. Walk the 6-step onboarding flow: business type (pre-fills services + accent colour),
   services, working hours, branding, booking mode + verification channel, then the live screen.
3. Refresh mid-flow at any step — you'll land back on the same step, since progress is persisted
   server-side on `Business.onboarding_step`.

## Environment variables

See `backend/.env.example` and `frontend/.env.example` for the full list, grouped by the
milestone that activates them. Nothing sensitive is committed; copy the example files to `.env`
locally. In dev mode, no SMS/Viber/WhatsApp provider keys or Turnstile keys are required —
verification codes are logged to the backend console and returned as `dev_code` in the API
response (`StubNotifier`), and Turnstile checks are skipped entirely.

## Internationalization

Macedonian (`mk`) is the default language; English (`en`) is the fallback. Translations live in
`frontend/src/i18n/{mk,en}.json` and are kept in lockstep (currently 182 keys each) — if you add a
user-facing string, add it to both files with the same key path. Language is auto-detected from
the browser by `i18next-browser-languagedetector`; a business's `locale_default` (set in
onboarding or dashboard Settings) only affects which language its *default services* are seeded
in, not the UI language itself (there's no language switcher in the UI yet — that'd be a
reasonable follow-up).

## Deployment notes

This was built and verified for local dev; here's what changes for a real deployment.

**Backend**
- Run behind a production WSGI server (e.g. `gunicorn wsgi:app`), not `python wsgi.py`.
- Set `FLASK_ENV=production`, a strong random `JWT_SECRET`, real `DATABASE_URL` pointing at
  Postgres, and real `TWILIO_*` / `TURNSTILE_SECRET_KEY` values once you have accounts for them.
- Run `flask --app wsgi.py db upgrade` as part of your deploy step, before traffic hits the new
  version.
- **Reminder scheduler and multiple workers don't mix.** The in-process APScheduler job
  (`ENABLE_REMINDER_SCHEDULER=true`) is convenient for a single dev/staging process, but if you run
  more than one gunicorn worker (or more than one instance), each one starts its own scheduler and
  you'll get duplicate reminders. For production, set `ENABLE_REMINDER_SCHEDULER=false` and instead
  point an external cron (or your platform's scheduled-job feature) at
  `flask --app wsgi.py send-reminders` on a single schedule, independent of however many web
  workers you run.
- **File storage**: `LocalStorage` (`app/storage.py`) writes to local disk, which doesn't survive
  redeploys or scale past one instance. Implement a second `Storage` subclass backed by S3/R2 and
  swap it in `get_storage()` — `POST /uploads` and everything else is written against the
  `Storage` interface, not the disk, so this is a localized change.
- Don't run `db.create_all()`-style auto-creation in prod; migrations (`flask db upgrade`) are the
  only schema source of truth.

**Frontend**
- `npm run build` produces static files in `frontend/dist/`; serve them from any static host or
  behind nginx. Set `VITE_API_URL` (and `VITE_TURNSTILE_SITE_KEY` once you have a real Turnstile
  site) at build time, since Vite inlines `import.meta.env.*` into the bundle.
- Update `CORS_ORIGINS` on the backend to the real frontend origin(s).

**Not yet done**: real Viber provider integration (still needs an external BSP account like
Infobip, same situation as Paddle/Twilio — code-ready, ops-blocked, not something to build further
without one), multi-country phone support beyond MK, prepayment/deposit collection, real per-staff
login accounts (a PIN-gated view shipped instead — see Milestone 7), a language switcher in the UI,
client-facing "manage my booking" links, and pagination on the appointments/clients/staff lists
(fine at current scale, won't be forever). Also worth watching once there's real signup data: the
combination of a no-free-tier paywall and a 7-step onboarding wizard is real signup friction —
That's everything I'd flag as money-risk. Go get some sleep — this is in a safe state.
nothing to fix in code, just a metric to keep an eye on.

## Roadmap

1. ~~Scaffold~~ ✅
2. ~~Auth + business + onboarding~~ ✅
3. ~~Public booking (availability, booking modes, tenant isolation)~~ ✅
4. ~~Verification + Notifier (SMS/Viber/WhatsApp, rate limits, Turnstile)~~ ✅
5. ~~Owner dashboard + branding (uploads, image downscaling)~~ ✅
6. ~~Reminders + polish (APScheduler, spend cap, i18n, deployment notes)~~ ✅
7. ~~Multi-staff, owner booking control~~ ✅ — detailed below
8. ~~Subscription paywall~~ ✅ — detailed below (real payment still needs your own Paddle account)

Future, not yet scheduled: prepayment/deposit collection for high-end businesses (needs Stripe
Connect or per-business merchant accounts), a real Viber provider (needs a Business Solution
Provider like Infobip), real per-staff login accounts if the PIN-gated view ends up insufficient,
and multi-country phone support beyond MK.

### Milestone 7 — staff, owner control, real channels

**Multi-staff** (`StaffMember`, `StaffWorkingHour` in `app/models.py`)
- Every business gets one `StaffMember` row automatically at registration, named "Owner" (created
  in `auth.register()` and `seed.py`) — existing single-operator businesses need zero UX change,
  since every staff-scoped endpoint defaults to "the business's only staff member" whenever a
  `staff_id` isn't given.
- Services are staff-scoped, not business-scoped (`Service.staff_id`, required) — each staff member
  has a fully independent service list and prices. `GET/POST /services` accept an optional
  `?staff_id=`/`staff_id` and default to the first staff member when omitted.
- `StaffWorkingHour` mirrors the old business-level `WorkingHour` table (now removed) but per staff
  member — independent hours per staff. `GET/PUT /working-hours` keep working unchanged for the
  solo case; `GET/PUT /staff/<id>/working-hours` manage a specific staff member's hours.
- `Appointment.staff_id` + denormalized `staff_name` record which staff member a booking is with
  (mirroring how `service_name`/`service_price` are already denormalized) — the active-slot
  uniqueness constraint moved from `(business_id, starts_at)` to `(staff_id, starts_at)`, so two
  different staff members can be booked at the same business-wide timestamp.
- Public booking flow (`StudioPage.tsx`): skips the staff picker entirely when a business has
  exactly one active staff member; shows a "choose your specialist" step first when there's more
  than one, then fetches that staff member's own services from
  `GET /b/<slug>/staff/<id>/services`. Availability/verify/book all derive which staff member is
  involved from the chosen service (`service.staff_id`) — the client never has to pass `staff_id`
  separately, so it can't drift from the service actually picked.
- Owner dashboard: Staff page (`/dashboard/staff`) is overview-only now — add/rename/deactivate/
  delete staff (blocked on the last remaining one), reset a forgotten PIN. No staff count limit is
  enforced yet — that's the Milestone 8 paywall's job.
- Self-service PIN view, not a full account system but more than read-only: each staff member sets
  their own 4-6 digit PIN themselves on first use (hashed with the same Argon2 helper as owner
  passwords; lockout after 5 wrong attempts for 15 minutes, mirroring the verification-code
  rate-limiting already in `app/rate_limit.py`). `POST /b/<slug>/staff/<id>/pin/setup` (first time)
  and `.../pin/login` issue a separate, short-lived (12h) `staff_access` token — distinct from the
  owner's JWT — accepted by `/staff/me`, `/staff/me/appointments` (+ `/move`, `/cancel` for their
  own bookings only), and `/staff/me/services` + `/staff/me/working-hours` (full CRUD on their own
  pricing/services/hours). Staff sign in at `/b/<slug>/staff-login`, landing on a tabbed portal at
  `/staff-portal` (My Agenda / My Services / My Hours).
- Owner PIN + "who's working" gate: a second, separate PIN lives on `Business.owner_pin_hash` (not
  tied to any staff seat, set/changed anytime from Settings since the owner already proved identity
  via password). After email+password, `/dashboard` shows a picker — owner's tile verifies their
  PIN inline; any staff name links out to the same `/b/<slug>/staff-login` flow. This only appears
  once a business has more than one staff member or the owner has opted in — solo businesses see no
  extra friction. A "Switch user" control clears it without re-entering email/password.

**Owner appointment control**
- `POST /appointments/<id>/move` — reschedule (and optionally reassign staff) bypassing the
  working-hours rules the public flow enforces; only the same-staff-same-instant DB constraint
  still applies, since two clients can't literally be in the same chair at once.
- `POST /appointments/<id>/cancel` now also accepts `notify_client` (still works exactly as before
  if omitted).
- `POST /appointments` lets the owner create a confirmed booking directly for a walk-in or phone
  call — same override freedom as move, accepts either an existing `client_id` or a new name+phone.
- Both move and cancel take an explicit `notify_client` flag that sends the client a message via
  the business's configured channel when set — an owner choice on every action right now, not
  tier-gated, since Milestone 8's billing/tiers don't exist yet to gate it against. Restricting the
  automated version to a paid tier is Milestone 8 work, not Milestone 7.

**Real channels**
- Twilio SMS/WhatsApp were already fully implemented in `app/notifier.py` before this milestone —
  nothing code-side changed; going live is purely an ops task (Twilio account + sender/Alphanumeric
  Sender ID + confirming current MK/BG deliverability rules with Twilio support for SMS; Meta
  Business verification + approved message templates for WhatsApp, since reminders/verification
  codes are business-initiated messages outside the free-form 24h window).
- Viber stays a stub — there's still no real provider wired in; revisit with a Business Solution
  Provider (e.g. Infobip) later.

### Milestone 8 — subscription paywall

**Tiers** (`app/plans.py` — a static catalog, not a DB table, same pattern as `business_types.py`).
Prices are placeholders, change them in one place:

| Plan  | Price/mo | Max staff | Real SMS/WhatsApp/Viber | Branding | Auto change-notify |
|-------|----------|-----------|--------------------------|----------|---------------------|
| Basic | €9       | 1         | No                       | No       | No                  |
| Mid   | €19      | 3         | Yes                      | Yes      | No                  |
| Top   | €39      | unlimited | Yes                      | Yes      | Yes                 |

Every tier requires payment — there is no free plan, including Basic. A brand-new registration
gets `subscription_status="none"` and must pick a plan at the new onboarding "Plan" step (between
Booking mode and the final "you're live" screen) before going live. Existing businesses from
before this migration were grandfathered onto Top/active so nothing already running broke.

**Data model** — `Business.plan_id` / `subscription_status` (`none`/`active`/`past_due`/
`canceled`) / `subscription_provider` / `subscription_customer_id` / `subscription_id` /
`current_period_end`. Provider-agnostic on purpose.

**Billing abstraction** (`app/billing.py`, same shape as `app/notifier.py`'s `StubNotifier`):
`get_billing_provider()` returns a `StubBillingProvider` (no `PADDLE_API_KEY` configured — this is
the default in dev) that activates the chosen plan immediately with no real payment, or a
`PaddleBillingProvider` once you configure real keys. This means the entire paywall — checkout,
tier limits, upgrade/downgrade, cancellation — works and is fully testable locally without ever
touching Paddle.

**Enforcement** (all server-side, never just hidden in the UI):
- Staff count — `POST /staff` returns 402 `plan_staff_limit_reached` past the plan's max; checkout
  itself refuses to downgrade below your current staff count (`plan_too_small_for_existing_staff`).
- Real channels — `get_notifier(channel, business)` forces the dev stub on Basic even if real
  Twilio credentials are configured, so a Basic business can't run up your Twilio bill.
- Branding — `POST /uploads` returns 402 `plan_branding_not_allowed` on Basic.
- Automated change-notifications — `notify_client` on move/cancel silently no-ops below Top (the
  move/cancel itself always still succeeds).
- The public booking surface itself (`GET /b/<slug>`, availability, verify, book) returns 402
  `subscription_required` whenever `subscription_status != "active"` — covers both a business that
  never subscribed and one whose subscription lapsed. Staff PIN sign-in is deliberately **not**
  gated, so staff can still see already-booked appointments if the owner's payment lapses.

**Webhook** (`POST /webhooks/paddle`) — verifies Paddle's `Paddle-Signature` header (HMAC-SHA256,
5-minute replay window) and updates `subscription_status`/`plan_id`/`current_period_end` from
`subscription.created`/`updated`/`canceled` events. Built against Paddle's documented API/webhook
shape, but **not verified against a live account** — test it against your sandbox's webhook
simulator before trusting it in production.

#### Going live with real payments (you'll need to do this part yourself)

Nothing above requires a Paddle account — everything works today via the stub. To actually charge
people:

1. Sign up at **https://www.paddle.com** and create a sandbox account first (there's a toggle
   between sandbox and live in the Paddle dashboard — stay in sandbox until you've tested a full
   checkout end-to-end).
2. In the sandbox dashboard, create **one Product + Price per plan** (Basic/Mid/Top) — note each
   Price's ID (looks like `pri_...`).
3. Get your sandbox **API key** (Developer Tools → Authentication) and your **webhook secret**
   (Developer Tools → Notifications → create a destination pointed at
   `https://<your-domain>/webhooks/paddle`, then copy its signing secret).
4. In `backend/.env`, set:
   ```
   PADDLE_API_KEY=<your sandbox API key>
   PADDLE_WEBHOOK_SECRET=<your webhook signing secret>
   PADDLE_SANDBOX=true
   PADDLE_PRICE_ID_BASIC=<price id for Basic>
   PADDLE_PRICE_ID_MID=<price id for Mid>
   PADDLE_PRICE_ID_TOP=<price id for Top>
   ```
5. Restart the backend — `get_billing_provider()` now returns `PaddleBillingProvider` instead of
   the stub. Subscribe to a plan from the app using one of
   [Paddle's sandbox test card numbers](https://developer.paddle.com/concepts/payment-methods/credit-debit-card#sandbox-testing)
   and confirm the webhook actually flips `subscription_status` to `active` (check the backend
   logs / `GET /me/business`).
6. Once that works end-to-end in sandbox: in the live Paddle dashboard, repeat steps 2-3 to create
   live products/prices/webhook, switch `PADDLE_SANDBOX=false`, and swap in the live API key/price
   IDs/webhook secret.
