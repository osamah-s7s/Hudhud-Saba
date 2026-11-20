# Hudhud Saba — survey website

A single-page website for the **Hudhud Saba** thesis research questionnaire
(Yemeni Heritage & Cultural Experience Center), styled in the "Night Majlis"
design. Visitors answer 15 questions in four sections (A–D); each completed
response is emailed to the researcher through SMTP. There is no database and
no accounts; names are never asked for, and the email contains answers only
(the visitor's IP address is used briefly in server memory for rate limiting
and is never emailed or logged by the app).

Built with Next.js 16 (App Router, TypeScript, Tailwind CSS v4) and made to
deploy on Vercel with default settings.

## Project structure

| Path | What it is |
| --- | --- |
| `src/data/survey.ts` | **Single source of truth** for every word of the survey: site name, intro text, sections A–D, the 15 questions, their options and option images. |
| `src/components/` | UI components for the page. |
| `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css` | The page, root layout and global styles. |
| `src/app/api/submit/route.ts` | `POST /api/submit` — validates a response and emails it. |
| `src/lib/answers.ts` | Shared answer types and validation, used by both the browser and the server. |
| `src/lib/email.ts` | SMTP configuration and the email (plain text + HTML) built from the answers. |
| `src/lib/rate-limit.ts` | Basic in-memory rate limiter. |
| `src/lib/site-metadata.ts` | Page title, description, Open Graph / Twitter metadata. |
| `src/app/icon.svg`, `src/app/apple-icon.png`, `src/app/opengraph-image.jpg` | Favicon, home-screen icon and link-preview image (Next.js file conventions). |
| `public/` | Static images (`hero.png`, `survey/*.jpg`). |

## Local development

Requires Node.js 20.9 or newer (the minimum for Next.js 16).

```bash
npm install
cp .env.example .env.local   # then fill in real SMTP values
npm run dev                  # http://localhost:3000
npm run build                # production build
npm run lint
```

Without SMTP settings the site still runs; submitting answers then returns a
"not configured" error (HTTP 503) and the server log names the missing
variables.

## How a response is sent (`/api/submit`)

1. **Request checks** — only `POST` with `Content-Type: application/json` and a
   body under 20 KB is accepted (otherwise 400 / 405).
2. **Spam check** — a hidden "website" field (honeypot) that people never see.
   If it is filled, the server replies "ok" without sending anything, so bots
   get no signal.
3. **Validation** — the server re-validates every answer with the same rules
   as the browser (`validateAnswers` in `src/lib/answers.ts`): unknown
   questions, unknown options, wrong types, over-long text and the
   "Nothing would prevent me" exclusivity rule are all rejected (400 with the
   question ids).
4. **Duplicate check** — each response carries a random id created when the
   visitor presses Begin. If the same id was already emailed (a retry after a
   dropped connection), the server replies "ok" and sends nothing. The id is
   also printed in the email as "Response ID", so a duplicate that slips
   through can be spotted. It identifies the response, not the person.
5. **Rate limit** — at most 30 emailed responses per client IP per 10 minutes
   (HTTP 429 with a `Retry-After` header). The limit is generous because a
   whole class on one campus network shares one public IP address. Only
   requests that would send an email are counted.
6. **Email** — answers are grouped by section with question numbers and the
   readable option labels. The free-text answer is trimmed, stripped of
   control characters and HTML-escaped, and only ever appears in the body.
   The email contains no IP address or other personal data.

**Limitation of the rate limit and the duplicate check (be aware):** they live in the memory of each
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
| `SMTP_HOST` | Yes | `smtp.example.com` | Your email provider's SMTP server. |
| `SMTP_PORT` | No | `587` | Defaults to `587`. Use `465` for implicit TLS. |
| `SMTP_SECURE` | No | `true` | `true` for implicit TLS (port 465). If empty it is derived from the port (`true` only for 465). On other ports the connection must upgrade with STARTTLS. |
| `SMTP_USER` | Yes | `survey@example.com` | SMTP login. |
| `SMTP_PASS` | Yes | `app-password` | SMTP password or app password. Keep it secret. |
| `SURVEY_FROM_EMAIL` | Sometimes | `survey@example.com` | Sender address. Defaults to `SMTP_USER`; required if your SMTP username is not an email address (e.g. `apikey`). Must be an address your provider allows you to send from. |
| `SURVEY_TO_EMAIL` | Yes | `responses@example.com` | Where responses are delivered. **Replace the placeholder with the real inbox.** |
| `NEXT_PUBLIC_SITE_URL` | No | `https://your-domain.example` | Only needed for a custom domain. Otherwise the Vercel deployment URL is used automatically for link-preview images. |

If you change environment variables on Vercel, redeploy for them to take effect.

## Deploying to Vercel

1. Push this repository to GitHub.
2. In Vercel, choose **Add New → Project** and import the GitHub repository.
3. The framework preset **Next.js** is detected automatically. Leave the
   build command, output directory and install command at their defaults.
4. Open **Environment Variables** and add the variables from the table above
   for the **Production** environment (and **Preview** too if you want preview
   deployments to send email).
5. Click **Deploy**.
6. When it is live, open the site, complete the survey once, and confirm the
   email arrives in the `SURVEY_TO_EMAIL` inbox (check spam the first time).
   If it does not, look at the function logs in Vercel (Project → Logs) for
   lines starting with `[submit]`: they name missing variables or show the
   SMTP error message.

**Not yet verified:** delivery through a real SMTP provider has not been
tested for this project (no credentials were available during development).
The route was tested locally against a throwaway SMTP test server, which
received a correctly formed message. Do the test submission in step 6 before
sharing the link.

Tip: many providers (e.g. Gmail / Google Workspace) require an "app
password" rather than your normal password for SMTP.

## Editing the survey

All survey text lives in `src/data/survey.ts`. Change wording there and it
updates both the page and the emails.

- Question and option **labels** can be edited freely.
- Option ids are generated from their position (`q1-1`, `q1-2`, …). Adding,
  removing or reordering options changes those ids, which only matters for
  visitors who have a half-finished survey saved in their browser (their
  stored answers for that question are dropped).
- `required`, `kind` (`single`, `multi`, `text`), `exclusive` and `maxLength`
  drive validation on both the browser and the server.

## Images

The images in `public/` (`hero.png` and `public/survey/*.jpg`) were recovered
from design screenshots at low resolution. To improve them, drop
higher-resolution originals at the **same paths**. If an image's aspect ratio
changes, update its `width` / `height` in `src/data/survey.ts`. If you replace
the hero, regenerate `src/app/opengraph-image.jpg` (1200 × 630) from it as well.
