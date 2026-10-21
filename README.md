# SubShield

**Find, understand, and cut recurring charges before they drain you.**

SubShield connects to a user's bank (Plaid) and inbox (Gmail / Outlook), detects every recurring charge, flags the ones leaking money — price hikes, duplicate billing, overlapping services, trials that quietly converted, vendors that keep charging after you cancel — and writes and sends the cancellation.

Free users see their total yearly waste and one leak. Everything else is behind a hard paywall ($9/mo or $59/yr), enforced in Postgres RLS as well as the UI.

## Run it

```bash
npm install
npm run dev
```

With no environment variables the app runs in **demo mode**: the real detection engine runs on a seeded 14-month ledger (20 subscriptions plus everyday noise), checkout is simulated, and no email is sent. Copy `.env.example` to `.env.local` to go live.

```bash
npm test          # detection engine tests
npm run typecheck
npm run build
```

## Going live

1. **Supabase** — create a project, then apply `supabase/migrations/20261019000000_init.sql` (`supabase db push`, or paste it into the SQL editor). Enable Email (magic link) and Google under Auth → Providers, and add `<APP_URL>/auth/callback` to the redirect allow-list.
2. **Token key** — `openssl rand -base64 32` → `TOKEN_ENCRYPTION_KEY`.
3. **Plaid** — keys from the dashboard, product **Transactions**. Webhook URL is set per link token: `<APP_URL>/api/plaid/webhook` (must be publicly reachable).
4. **Stripe** — create two recurring prices ($9/mo, $59/yr), set `STRIPE_PRICE_*`, add a webhook to `<APP_URL>/api/stripe/webhook` for `checkout.session.completed` and `customer.subscription.created|updated|deleted`, enable the customer portal.
5. **Resend** — verify your sending domain; set `EMAIL_FROM` and `CANCELLATION_FROM` on it.
6. **Inbox (optional)** — Google OAuth client with the `gmail.readonly` scope and redirect `<APP_URL>/api/connect/google/callback`; Microsoft app with `Mail.Read` and redirect `<APP_URL>/api/connect/microsoft/callback`. Note: `gmail.readonly` is a restricted scope — production use requires Google's security assessment.
7. **Cron** — `vercel.json` runs `/api/cron/renewal-alerts` daily; set `CRON_SECRET`.

## Deploying to Vercel

1. Push this repo to GitHub, then **Add New → Project** in Vercel and import it. The framework preset (Next.js) and build command are detected automatically; Node 20.9+ is pinned in `package.json`.
2. Add the environment variables from `.env.example` under **Settings → Environment Variables**. Set `NEXT_PUBLIC_APP_URL` to the production URL. With no variables at all the deployment runs in demo mode, which is a safe first deploy.
3. The daily renewal-alert cron in `vercel.json` is registered on the first production deploy; Vercel sends `CRON_SECRET` as a bearer token.
4. After the first deploy, point the Plaid webhook, Stripe webhook and OAuth redirect URIs at the production domain (see **Going live**).

### Error monitoring (Sentry) and analytics (PostHog)

Both are off until their keys are set, so local and demo runs report nothing.

- **Sentry** — set `NEXT_PUBLIC_SENTRY_DSN`. Add `SENTRY_ORG`, `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN` to upload source maps at build time for readable stack traces. Reports are sent through `/monitoring` on our own domain. Request bodies, cookies, query strings and auth/webhook headers are stripped (`lib/observability/sentry.ts`), there is no session replay, and only the signed-in user's opaque id is attached — never their email.
- **PostHog** — set `NEXT_PUBLIC_POSTHOG_KEY` (and the host variables for EU projects), then enable **Cookieless server hash mode** in the PostHog project settings. It runs cookieless — no cookies or local storage, so no consent banner is needed — with autocapture and session recording off, proxied through `/ingest`. Only explicit funnel events are sent (`lib/analytics.ts`): `cta_clicked`, `scan_started`, `scan_completed`, `paywall_opened`, `checkout_started`, `pro_unlocked`, `cancellation_sent`. Mark any new marketing CTA with `data-track="<location>"`.

## How it's built

| Area | Where |
| --- | --- |
| Leak engine (clustering, cycles, hikes, duplicates, overlaps, trials, charged-after-cancel, Waste Index) | `lib/detection/` — pure, unit-tested |
| Merchant catalog + dark-pattern cancellation library | `lib/catalog/merchants.ts` |
| Paywall projection (what free vs Pro can see) | `lib/data/project.ts`, mirrored by RLS |
| Sync pipeline (Plaid `/transactions/sync`, inbox scan, upsert, teaser, alerts) | `lib/sync/sync-user.ts` |
| Region-aware cancellation letters | `lib/cancellation/letters.ts` |
| Server Actions (auth, connections, billing, cancellations, settings) | `lib/actions/` |
| Webhooks & cron | `app/api/plaid/webhook`, `app/api/stripe/webhook`, `app/api/cron/renewal-alerts` |
| Schema + RLS | `supabase/migrations/` |

Type is Switzer by Indian Type Foundry (ITF Free Font License), self-hosted from `app/fonts/` via `next/font/local`.

Stack: Next.js 16 (App Router, Cache Components, Proxy), React 19, Tailwind CSS 4, Radix primitives, Framer Motion, Recharts, CSS-built phone mockups, Supabase (`@supabase/ssr`), Plaid, Stripe, Resend + React Email, Twilio.

### Security notes

- Plaid access tokens and OAuth refresh tokens are sealed with AES-256-GCM before storage; the token columns aren't even selectable by the `authenticated` role.
- Users can only update their own preference columns — `is_pro`, Stripe ids and plan are written exclusively by the signature-verified, idempotent Stripe webhook.
- Plaid webhooks are verified (ES256 JWT over the SHA-256 of the body). OAuth state is HMAC-signed and bound to a one-time nonce cookie.
- Cancellation emails are Pro-only, rate-limited (10/day), sent from your domain with the user in CC and replies routed to them.
- Cancellation templates are not legal advice; the UI says so.
