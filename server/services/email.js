const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD
    }
});

async function sendEmail({ to, subject, html }) {
    const user = process.env.SMTP_USER || process.env.EMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;
    
    if (!user || !pass) {
        console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
        console.log(`[MOCK EMAIL BODY]:\n${html}\n-------------------`);
        return true;
    }
    
    try {
        await transporter.sendMail({
            from: `"GiftsNPrint" <${user}>`,
            to,
            subject,
            html
        });
        return true;
    } catch (err) {
        console.error('Email send failed:', err);
        return false;
    }
}

module.exports = { sendEmail };
