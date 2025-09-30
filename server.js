require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');


const app = express();


app.use(helmet());
app.use(express.json());
app.use(cors({
    origin: (process.env.CORS_ORIGIN || '*').split(','),
}));


// Rate limit to reduce spam
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 50 }));


// Basic helpers
const isEmail = (v = '') => /.+@.+\..+/.test(v);
const sanitize = (s = '') => String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;');


app.post('/api/contact', async (req, res) => {
    const { name, email, subject, message } = req.body || {};


    if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: 'Te rugăm să completezi toate câmpurile.' });
    }
    if (!isEmail(email)) {
        return res.status(400).json({ error: 'Email invalid.' });
    }


    // Configure Gmail SMTP via App Password
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
<h2>Mesaj nou din formularul de contact</h2>
<p><strong>Nume:</strong> ${sanitize(name)}</p>
<p><strong>Email:</strong> ${sanitize(email)}</p>
<p><strong>Subiect:</strong> ${sanitize(subject)}</p>
<p><strong>Mesaj:</strong><br/>${sanitize(message).replace(/\n/g, '<br/>')}</p>
`;


    try {
        await transporter.sendMail({
            from: `Website Contact <${process.env.GMAIL_USER}>`,
            to: process.env.TO_EMAIL || process.env.GMAIL_USER,
            replyTo: email,
            subject: `[Contact] ${subject}`,
            text: `Nume: ${name}\nEmail: ${email}\nSubiect: ${subject}\n\n${message}`,
            html,
        });


        return res.json({ ok: true });
    } catch (err) {
        console.error('Mail error:', err);
        return res.status(500).json({ error: 'Nu am putut trimite emailul. Verifică setările serverului.' });
    }
});


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));