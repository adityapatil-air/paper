// Transactional email. Providers:
//   brevo   - Brevo HTTP API (free plan, no SMTP ports needed, works on Render's free tier)
//   console - print the email to the server log instead of sending (default when unconfigured)
// sendEmail never throws: workflow requests must not fail because an email could not be sent.

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

const provider = () => {
  const p = String(process.env.EMAIL_PROVIDER || '').toLowerCase();
  if (p === 'brevo' && process.env.BREVO_API_KEY) return 'brevo';
  return 'console';
};

const sender = () => ({
  email: process.env.EMAIL_FROM || 'no-reply@example.com',
  name: process.env.EMAIL_FROM_NAME || 'IJEPA Editorial Office',
});

const describeProvider = () => {
  const p = provider();
  if (p === 'brevo') return `brevo (from ${sender().email})`;
  if (String(process.env.EMAIL_PROVIDER || '').toLowerCase() === 'brevo') return 'console (BREVO_API_KEY missing, emails are only logged)';
  return 'console (emails are only logged)';
};

const sendViaBrevo = async ({ to, subject, html, text, replyTo }) => {
  const body = {
    sender: sender(),
    to: [{ email: to.email, ...(to.name ? { name: to.name } : {}) }],
    subject,
    htmlContent: html,
    textContent: text,
    ...(replyTo ? { replyTo: { email: replyTo } } : {}),
  };
  const response = await fetch(BREVO_URL, {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Brevo ${response.status}: ${detail.slice(0, 300)}`);
  }
};

// to: { email, name? } or a plain email string. Returns true when sent (or logged).
const sendEmail = async ({ to, subject, html, text, replyTo }) => {
  const recipient = typeof to === 'string' ? { email: to } : to;
  const email = String(recipient?.email || '').trim();
  if (!email || !subject) return false;
  try {
    if (provider() === 'brevo') {
      await sendViaBrevo({ to: { ...recipient, email }, subject, html, text, replyTo });
      console.log(`[email] sent "${subject}" to ${email}`);
    } else {
      console.log(`[email:console] To: ${email}\n  Subject: ${subject}\n  ${String(text || '').split('\n').join('\n  ')}`);
    }
    return true;
  } catch (err) {
    console.error(`[email] could not send "${subject}" to ${email}:`, err.message || err);
    return false;
  }
};

// Sends one email per recipient (addresses are never exposed to each other). Duplicates are skipped.
const sendToMany = async (recipients, build) => {
  const seen = new Set();
  const list = (recipients || []).filter((r) => {
    const key = String(r?.email || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const results = await Promise.all(list.map((r) => sendEmail({ to: r, ...build(r) })));
  return results.filter(Boolean).length;
};

module.exports = { sendEmail, sendToMany, describeProvider };
