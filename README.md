# Hudhud Saba — survey website

A single-page website for the **Hudhud Saba** thesis research questionnaire
(Yemeni Heritage & Cultural Experience Center), styled in the "Night Majlis"
design. Visitors answer 15 questions in four sections (A–D); each completed
response is saved in a Supabase database and shown to the researcher in a
private admin panel at `/admin`. Optionally, each response is also emailed
through SMTP.

Visitors have no accounts and names are never asked for. A stored response
holds only the answers, the time it was saved and how long the form took to
fill (in seconds). No IP address, user agent or name is stored or emailed
(the visitor's IP address is used briefly in server memory for rate limiting
and is never saved or logged by the app).

Built with Next.js 16 (App Router, TypeScript, Tailwind CSS v4) and made to
deploy on Vercel with default settings.

## Project structure

| Path | What it is |
| --- | --- |
| `src/data/survey.ts` | **Single source of truth** for every word of the survey: site name, intro text, sections A–D, the 15 questions, their options and option images. |
| `src/components/` | UI components for the page. |
| `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css` | The page, root layout and global styles. |
| `src/app/api/submit/route.ts` | `POST /api/submit` — validates a response, saves it to Supabase and (optionally) emails it. |
| `src/app/admin/`, `src/components/admin/` | The admin panel: login page, responses, charts, PNG / Excel / CSV export. |
| `src/lib/answers.ts` | Shared answer types and validation, used by both the browser and the server. |
| `src/lib/responses.ts` | Server-only Supabase data layer: save, list and delete responses. |
| `src/lib/admin-auth.ts` | Admin login and the signed session cookie. |
| `src/lib/admin-stats.ts` | Totals and per-question counts for the admin charts. |
| `src/lib/email.ts` | Optional SMTP configuration and the email (plain text + HTML) built from the answers. |
| `src/lib/rate-limit.ts` | Basic in-memory rate limiter. |
| `src/lib/site-metadata.ts` | Page title, description, Open Graph / Twitter metadata. |
| `src/app/icon.svg`, `src/app/apple-icon.png`, `src/app/opengraph-image.jpg` | Favicon, home-screen icon and link-preview image (Next.js file conventions). |
| `public/` | Static images (`hero.png`, `survey/*.jpg`). |

## Local development

Requires Node.js 20.9 or newer (the minimum for Next.js 16).

```bash
npm install
cp .env.example .env.local   # then fill in the real values
npm run dev                  # http://localhost:3000
npm run build                # production build
npm run lint
```

Without the Supabase settings the site still runs; submitting answers then
returns a "not configured" error (HTTP 503) and the server log names the
missing variables. SMTP settings are optional: without them responses are
stored but not emailed.

## Database (Supabase)

Responses live in one table, `public.survey_responses`:

```sql
create table public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  answers jsonb not null,
  duration_seconds integer check (duration_seconds >= 0)
);
alter table public.survey_responses enable row level security;
```

Row Level Security is enabled with **no policies**, so the table cannot be
read or written with the public (publishable) key at all. Only the server
uses it, through `SUPABASE_SECRET_KEY`. `answers` holds option ids (for
example `q1-2`) and the free text, keyed by question id.

## How a response is saved (`/api/submit`)

1. **Rate limit** — at most 5 submissions per client IP per 10 minutes
   (HTTP 429 with a `Retry-After` header).
2. **Request checks** — only `POST` with `Content-Type: application/json` and a
   body under 20 KB is accepted (otherwise 400 / 405).
3. **Spam checks** — a hidden "website" field (honeypot) that people never see,
   and a check that the form was not submitted less than 3 seconds after
   pressing Begin. Either one makes the server reply "ok" without storing or
   sending anything, so bots get no signal.
4. **Validation** — the server re-validates every answer with the same rules
   as the browser (`validateAnswers` in `src/lib/answers.ts`): unknown
   questions, unknown options, wrong types, over-long text and the
   "Nothing would prevent me" exclusivity rule are all rejected (400 with the
   question ids).
5. **Save** — the free-text answer is trimmed and stripped of control
   characters, then the answers are inserted into Supabase together with the
   fill duration in whole seconds (left empty when the browser's start time
   is missing or not believable). If storage is not configured the reply is
   503; if the insert fails it is 502 and the visitor can retry. Nothing is
   emailed in either case.
6. **Email (optional)** — only when SMTP is configured. Answers are grouped
   by section with question numbers and the readable option labels; the
   free text is HTML-escaped and only ever appears in the body. The email
   contains no IP address or other personal data. Once the row is saved, a
   missing SMTP setup or a failed send does **not** fail the request: it is
   only noted in the server log.

## Admin panel (`/admin`)

- Open `/admin` directly; it is not linked from anywhere on the site.
- There is a single account, defined by `ADMIN_USERNAME` and
  `ADMIN_PASSWORD`. Sign in at `/admin/login`. The session is kept in a
  cookie signed with `ADMIN_SESSION_SECRET`; changing that value signs
  everyone out.
- It shows every stored response, with a pie or donut chart of the answers
  per question in the site's own colours. Each chart, or the whole results
  board, can be downloaded as a PNG image; all responses can be exported as
  an Excel workbook (Responses, Summary, Suggestions sheets) or a CSV file.
- `src/proxy.ts` redirects signed-out visitors of `/admin` to the login page;
  every admin page, action and export also checks the session itself.
- Choose a long, unique password: anyone who can sign in can read every
  response.

**Limitation of the rate limit (be aware):** it lives in the memory of each
serverless function instance. On Vercel that means it is per instance, is not
shared between instances, and resets on cold starts and redeploys. It is basic,
best-effort protection only. For stronger protection, add a rate-limit rule
for `/api/submit` in the Vercel Firewall (Project → Firewall), or move the
counter into a shared store such as a Redis/KV integration.

## Environment variables

Set these in Vercel under **Project → Settings → Environment Variables**
(and in `.env.local` for local development). They are server-only: do **not**
prefix them with `NEXT_PUBLIC_`.

| Name | Required | Example | Notes |
| --- | --- | --- | --- |
| `SUPABASE_URL` | Yes | `https://your-project-ref.supabase.co` | Supabase project URL (Project Settings → API). |
| `SUPABASE_SECRET_KEY` | Yes | `sb_secret_…` | Supabase **secret** API key. Gives full access to the database: keep it secret and never use it in browser code. |
| `ADMIN_USERNAME` | Yes | `admin` | Username for the admin panel. |
| `ADMIN_PASSWORD` | Yes | a long password | Password for the admin panel. Keep it secret. |
| `ADMIN_SESSION_SECRET` | Yes | a long random string | Signs the admin session cookie; must be at least 32 characters. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. |
| `SMTP_HOST` | For email | `smtp.example.com` | Your email provider's SMTP server. |
| `SMTP_PORT` | No | `587` | Defaults to `587`. Use `465` for implicit TLS. |
| `SMTP_SECURE` | No | `true` | `true` for implicit TLS (port 465). If empty it is derived from the port (`true` only for 465). On other ports the connection must upgrade with STARTTLS. |
| `SMTP_USER` | For email | `survey@example.com` | SMTP login. |
| `SMTP_PASS` | For email | `app-password` | SMTP password or app password. Keep it secret. |
| `SURVEY_FROM_EMAIL` | Sometimes | `survey@example.com` | Sender address. Defaults to `SMTP_USER`; required if your SMTP username is not an email address (e.g. `apikey`). Must be an address your provider allows you to send from. |
| `SURVEY_TO_EMAIL` | For email | `responses@example.com` | Where response emails are delivered. |
| `NEXT_PUBLIC_SITE_URL` | No | `https://your-domain.example` | Only needed for a custom domain. Otherwise the Vercel deployment URL is used automatically for link-preview images. |

The `SMTP_*` and `SURVEY_*_EMAIL` variables are optional as a group: leave
them all unset to store responses without emailing them. "For email" means
required only if you want the email copy.

If you change environment variables on Vercel, redeploy for them to take effect.

## Deploying to Vercel

1. Push this repository to GitHub.
2. In Vercel, choose **Add New → Project** and import the GitHub repository.
3. The framework preset **Next.js** is detected automatically. Leave the
   build command, output directory and install command at their defaults.
4. Open **Environment Variables** and add the variables from the table above
   for the **Production** environment (and **Preview** too if you want preview
   deployments to work; note they would then write to the same database).
5. Click **Deploy**.
6. When it is live, open the site, complete the survey once, then sign in at
   `/admin` and confirm the response is listed. If you set up SMTP, also
   confirm the email arrives in the `SURVEY_TO_EMAIL` inbox (check spam the
   first time). If something is missing, look at the function logs in Vercel
   (Project → Logs) for lines starting with `[submit]`: they name missing
   variables or show the database or SMTP error message.

**Not yet verified:** delivery through a real SMTP provider has not been
tested for this project (no credentials were available during development).
The email was tested locally against a throwaway SMTP test server, which
received a correctly formed message. If you rely on the email copy, do the
test submission in step 6 before sharing the link.

Tip: many providers (e.g. Gmail / Google Workspace) require an "app
password" rather than your normal password for SMTP.

## Editing the survey

All survey text lives in `src/data/survey.ts`. Change wording there and it
updates the page, the admin panel and the emails.

- Question and option **labels** can be edited freely.
- Option ids are generated from their position (`q1-1`, `q1-2`, …). Adding,
  removing or reordering options changes those ids. **Avoid this once real
  responses have been collected:** stored responses keep the old ids, so
  their answers to that question would be shown under the wrong label or
  left out of the admin panel. (Visitors with a half-finished survey saved in
  their browser also lose their answer to that question.)
- `required`, `kind` (`single`, `multi`, `text`), `exclusive` and `maxLength`
  drive validation on both the browser and the server.

## Images

The images in `public/` (`hero.png` and `public/survey/*.jpg`) were recovered
from design screenshots at low resolution. To improve them, drop
higher-resolution originals at the **same paths**. If an image's aspect ratio
changes, update its `width` / `height` in `src/data/survey.ts`. If you replace
the hero, regenerate `src/app/opengraph-image.jpg` (1200 × 630) from it as well.
