import nodemailer, { type Transporter } from "nodemailer";
import { questions, sections } from "@/data/survey";
import { formatAnswer, type Answers } from "@/lib/answers";

/*
 * SMTP email for survey responses. Server-only: every variable here is read
 * from process.env at request time and none of them is NEXT_PUBLIC_, so they
 * never reach the browser bundle. Values are never logged or returned.
 */

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
}

export type EmailConfigResult =
  | { ok: true; config: EmailConfig }
  /** `problems` holds variable NAMES only (missing or invalid), never values. */
  | { ok: false; problems: string[] };

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

export function getEmailConfig(): EmailConfigResult {
  const problems: string[] = [];
  const required = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SURVEY_TO_EMAIL"] as const;
  for (const name of required) if (!env(name)) problems.push(name);

  const rawPort = env("SMTP_PORT");
  const port = rawPort ? Number(rawPort) : 587;
  if (!Number.isInteger(port) || port < 1 || port > 65535) problems.push("SMTP_PORT (invalid)");

  const rawSecure = env("SMTP_SECURE").toLowerCase();
  // Implicit TLS on 465; STARTTLS (upgraded after connect) on 587/25.
  const secure = rawSecure ? rawSecure === "true" || rawSecure === "1" : port === 465;

  // Some providers' SMTP usernames are not addresses (e.g. "apikey"); then a
  // sender address must be given explicitly.
  const from = env("SURVEY_FROM_EMAIL") || env("SMTP_USER");
  if (from && !from.includes("@")) {
    problems.push(env("SURVEY_FROM_EMAIL") ? "SURVEY_FROM_EMAIL (invalid)" : "SURVEY_FROM_EMAIL");
  }

  if (problems.length > 0) return { ok: false, problems };
  return {
    ok: true,
    config: {
      host: env("SMTP_HOST"),
      port,
      secure,
      user: env("SMTP_USER"),
      pass: env("SMTP_PASS"),
      from,
      to: env("SURVEY_TO_EMAIL"),
    },
  };
}

let cached: { key: string; transporter: Transporter } | null = null;

/** Created lazily on first send and reused while the function instance is warm. */
function getTransporter(config: EmailConfig): Transporter {
  const key = [config.host, config.port, config.secure, config.user, config.pass].join("\u0000");
  if (cached?.key === key) return cached.transporter;

  const isLocal = config.host === "localhost" || config.host === "127.0.0.1" || config.host === "::1";
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    // On a non-465 port, insist on STARTTLS so the password is never sent in
    // clear text. Only a local test sink on this machine is exempt.
    requireTLS: !config.secure && !isLocal,
    auth: { user: config.user, pass: config.pass },
    // Keep a stuck SMTP server from hanging the serverless function.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
    dnsTimeout: 10_000,
    // Message content never references files or URLs; refuse them outright.
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  cached = { key, transporter };
  return transporter;
}

/**
 * Normalises visitor free text before it goes into the email: unifies line
 * breaks, removes control characters (keeping newlines and tabs), and trims.
 */
export function cleanFreeText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u2028\u2029]/g, "")
    .trim();
}

/** Trims / strips control characters from every free-text answer. */
export function cleanAnswers(answers: Answers): Answers {
  const out: Answers = { ...answers };
  for (const q of questions) {
    const value = out[q.id];
    if (q.kind === "text" && typeof value === "string") out[q.id] = cleanFreeText(value);
  }
  return out;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface SurveyEmail {
  subject: string;
  text: string;
  html: string;
}

/**
 * Builds the email body from validated answers. Contains survey answers
 * only: no IP address, user agent or other identifying data (the survey
 * promises respondents anonymity). Visitor text only ever goes in the body,
 * HTML-escaped, never in a header.
 */
export function buildSurveyEmail(answers: Answers, submittedAt = new Date()): SurveyEmail {
  const iso = submittedAt.toISOString();
  const subject = `Hudhud Saba survey response — ${iso}`;

  const textLines: string[] = [`Hudhud Saba survey response`, `Submitted: ${iso}`, ""];
  const htmlParts: string[] = [
    `<div style="font-family:Georgia,'Times New Roman',serif;color:#34302C;max-width:640px">`,
    `<h1 style="font-size:20px;color:#713B2E;margin:0 0 4px">Hudhud Saba survey response</h1>`,
    `<p style="margin:0 0 16px;color:#68734B;font-size:13px">Submitted: ${escapeHtml(iso)}</p>`,
  ];

  for (const section of sections) {
    const inSection = questions.filter((q) => q.section === section.id);
    if (inSection.length === 0) continue;

    const heading = `Section ${section.id} — ${section.title}`;
    textLines.push(heading, "-".repeat(heading.length));
    htmlParts.push(
      `<h2 style="font-size:16px;color:#762F35;border-bottom:1px solid #E8D5B7;padding-bottom:4px;margin:24px 0 8px">${escapeHtml(heading)}</h2>`,
    );

    for (const q of inSection) {
      const value = answers[q.id];
      const label = `${q.number}. ${q.prompt}`;
      htmlParts.push(`<p style="margin:12px 0 4px;font-weight:bold">${escapeHtml(label)}</p>`);

      if (q.kind === "multi" && Array.isArray(value) && value.length > 0) {
        const items = value.map((id) => formatAnswer(q, [id]));
        textLines.push(label, ...items.map((item) => `   - ${item}`), "");
        htmlParts.push(
          `<ul style="margin:0 0 0 20px;padding:0">${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`,
        );
      } else {
        const formatted = formatAnswer(q, value);
        const indented = formatted.split("\n").join("\n   ");
        textLines.push(label, `   ${indented}`, "");
        htmlParts.push(
          `<p style="margin:0 0 0 20px;white-space:pre-wrap">${escapeHtml(formatted)}</p>`,
        );
      }
    }
  }

  htmlParts.push(`</div>`);
  return { subject, text: textLines.join("\n"), html: htmlParts.join("\n") };
}

export async function sendSurveyEmail(config: EmailConfig, email: SurveyEmail): Promise<void> {
  const transporter = getTransporter(config);
  await transporter.sendMail({
    from: config.from,
    to: config.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
}
