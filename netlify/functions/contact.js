const nodemailer = require('nodemailer');

const parseOrigins = (v) =>
  (v || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

const ALLOWED = parseOrigins(process.env.CORS_ORIGIN); // ex: "http://localhost:5173,https://siteul-tau.netlify.app"

const cors = (origin) => {
  // dacă nu ai setat nimic, permitem pe '*'
  const allow = ALLOWED.length ? (ALLOWED.includes(origin) ? origin : ALLOWED[0]) : '*';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
};

exports.handler = async (event) => {
  const origin = event.headers.origin || '';
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors(origin) };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors(origin), body: 'Method Not Allowed' };
  }

  try {
    const { name, email, subject, message } = JSON.parse(event.body || '{}') || {};
    if (!name || !email || !subject || !message) {
      return { statusCode: 400, headers: cors(origin), body: JSON.stringify({ error: 'Te rugăm să completezi toate câmpurile.' }) };
    }
    if (!/.+@.+\..+/.test(email)) {
      return { statusCode: 400, headers: cors(origin), body: JSON.stringify({ error: 'Email invalid.' }) };
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });

    const esc = (s='') => String(s).replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const html = `
      <h2>Mesaj nou din formular</h2>
      <p><strong>Nume:</strong> ${esc(name)}</p>
      <p><strong>Email:</strong> ${esc(email)}</p>
      <p><strong>Subiect:</strong> ${esc(subject)}</p>
      <p><strong>Mesaj:</strong><br/>${esc(message).replace(/\n/g,'<br/>')}</p>`;

    await transporter.sendMail({
      from: `Website Contact <${process.env.GMAIL_USER}>`,
      to: process.env.TO_EMAIL || process.env.GMAIL_USER,
      replyTo: email,
      subject: `[Contact] ${subject}`,
      text: `Nume: ${name}\nEmail: ${email}\nSubiect: ${subject}\n\n${message}`,
      html,
    });

    return { statusCode: 200, headers: cors(origin), body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('Mail error:', err);
    return { statusCode: 500, headers: cors(origin), body: JSON.stringify({ error: 'Nu am putut trimite emailul.' }) };
  }
};
