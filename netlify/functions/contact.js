const nodemailer = require('nodemailer');

const allowOrigin = process.env.CORS_ORIGIN || '*';

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(allowOrigin) };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(allowOrigin), body: 'Method Not Allowed' };
  }

  try {
    const { name, email, subject, message } = JSON.parse(event.body || '{}') || {};
    if (!name || !email || !subject || !message) {
      return resp(400, { error: 'Te rugăm să completezi toate câmpurile.' });
    }
    if (!/.+@.+\..+/.test(email)) {
      return resp(400, { error: 'Email invalid.' });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const html = `
      <h2>Mesaj nou din formular</h2>
      <p><strong>Nume:</strong> ${esc(name)}</p>
      <p><strong>Email:</strong> ${esc(email)}</p>
      <p><strong>Subiect:</strong> ${esc(subject)}</p>
      <p><strong>Mesaj:</strong><br/>${esc(message).replace(/\n/g,'<br/>')}</p>
    `;

    await transporter.sendMail({
      from: `Website Contact <${process.env.GMAIL_USER}>`,
      to: process.env.TO_EMAIL || process.env.GMAIL_USER,
      replyTo: email,
      subject: `[Contact] ${subject}`,
      text: `Nume: ${name}\nEmail: ${email}\nSubiect: ${subject}\n\n${message}`,
      html,
    });

    return resp(200, { ok: true });
  } catch (err) {
    console.error('Mail error:', err);
    return resp(500, { error: 'Nu am putut trimite emailul.' });
  }
};

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
function resp(code, body) {
  return { statusCode: code, headers: corsHeaders(allowOrigin), body: JSON.stringify(body) };
}
function esc(s = '') { return String(s).replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
