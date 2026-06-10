const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

async function sendEmail({ to, subject, html }) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
        console.log(`[MOCK EMAIL BODY]:\n${html}\n-------------------`);
        return true;
    }
    
    try {
        await transporter.sendMail({
            from: `"GiftsNPrint" <${process.env.SMTP_USER}>`,
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
