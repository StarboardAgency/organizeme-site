/**
 * Organize Me! — Cloudflare Worker
 *
 * Serves the static site from /public and handles the Connect form at
 * POST /api/contact, emailing each submission to Jenn via Cloudflare Email Service.
 *
 * Config (wrangler.jsonc / dashboard variables):
 *   EMAIL       send_email binding (Cloudflare Email Service)
 *   CONTACT_TO  where submissions go          (default jenn@organizeme.org)
 *   MAIL_FROM   sender on the onboarded domain (default website@organizeme.org)
 */

const MAX_FIELD = 3000;
const MIN_FILL_MS = 3000; // bots submit instantly; humans take longer

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Send www.organizeme.org (and any non-canonical host) to the bare domain.
    if (url.hostname === 'www.organizeme.org') {
      url.hostname = 'organizeme.org';
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === '/api/contact') {
      if (request.method !== 'POST') {
        return json({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'POST' });
      }
      return handleContact(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: 'Invalid submission.' }, 400);
  }

  const get = (k) => String(form.get(k) ?? '').trim().slice(0, MAX_FIELD);

  // Spam checks: honeypot filled, or submitted impossibly fast. Pretend success.
  const started = Number(get('started')) || 0;
  if (get('website') || (started && Date.now() - started < MIN_FILL_MS)) {
    return json({ ok: true });
  }

  const name = get('name');
  const email = get('email');
  const phone = get('phone');
  const other = get('other');
  const message = get('message');
  const spaces = form.getAll('spaces').map((s) => String(s).slice(0, 40)).slice(0, 10);
  const terms = get('terms') === 'yes';

  const errors = [];
  if (!name) errors.push('your name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('a valid email');
  if (phone.replace(/\D/g, '').length < 10) errors.push('a phone number with area code');
  if (!spaces.length) errors.push('at least one space');
  if (!terms) errors.push('agreement to the Terms of Service');
  if (errors.length) {
    return json({ ok: false, error: `Please provide ${errors.join(', ')}.` }, 422);
  }

  const spaceList = spaces.map((s) => (s === 'Other' && other ? `Other: ${other}` : s)).join(', ');

  const rows = [
    ['Name', name],
    ['Email', email],
    ['Phone', phone],
    ['Spaces', spaceList],
    ['Message', message || '(none)'],
    ['Accepted Terms', 'Yes'],
  ];

  const text =
    'New consultation request from organizeme.org\n\n' +
    rows.map(([k, v]) => `${k}: ${v}`).join('\n') +
    '\n\nReply to this email to respond directly to the client.';

  const html = `<div style="font-family:Arial,sans-serif;color:#252758;max-width:560px">
  <h2 style="color:#1953bc;margin:0 0 12px">New consultation request</h2>
  <table cellpadding="8" style="border-collapse:collapse;width:100%">
    ${rows
      .map(
        ([k, v]) =>
          `<tr><td style="border-bottom:1px solid #e5e5ee;font-weight:bold;width:130px;vertical-align:top">${esc(k)}</td><td style="border-bottom:1px solid #e5e5ee;white-space:pre-wrap">${esc(v)}</td></tr>`
      )
      .join('')}
  </table>
  <p style="color:#6b6a6a;font-size:13px">Sent from the Connect form on organizeme.org. Hit Reply to respond to ${esc(name)}.</p>
</div>`;

  if (!env.EMAIL) {
    console.error('Contact form: EMAIL binding is not configured.');
    return json({ ok: false, error: fallbackMsg() }, 500);
  }

  try {
    await env.EMAIL.send({
      to: env.CONTACT_TO || 'jenn@organizeme.org',
      from: { email: env.MAIL_FROM || 'website@organizeme.org', name: 'Organize Me! Website' },
      replyTo: { email, name },
      subject: `New consultation request: ${name} (${spaceList})`.slice(0, 200),
      text,
      html,
    });
    return json({ ok: true });
  } catch (err) {
    console.error('Contact form send failed:', err && err.code, err && err.message);
    return json({ ok: false, error: fallbackMsg() }, 502);
  }
}

function fallbackMsg() {
  return 'Sorry, we could not send your message right now. Please call +1 706-593-9493 or email jenn@organizeme.org.';
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}
