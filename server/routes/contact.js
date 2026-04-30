const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const db = require('../config/database');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
    port: 587, secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD }
});

// POST /api/contact
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, company, enquiry_type, subject, message, product_id, quantity, budget_range } = req.body;
        if (!name || !email || !message) return res.status(400).json({ success: false, message: 'Name, email, and message required.' });
        await db.execute(
            'INSERT INTO enquiries (name, email, phone, company, enquiry_type, subject, message, product_id, quantity, budget_range) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, email, phone||null, company||null, enquiry_type||'general', subject||'Contact', message, product_id||null, quantity||null, budget_range||null]
        );
        await transporter.sendMail({ from: process.env.EMAIL_FROM, to: process.env.ADMIN_EMAIL, subject: `New Enquiry: ${name}`, html: `<p><b>${name}</b> (${email}, ${phone})<br/>${message}</p>` });
        await transporter.sendMail({ from: process.env.EMAIL_FROM, to: email, subject: 'Thanks for contacting GiftsNPrint!', html: `<p>Hi ${name}, we received your enquiry and will reply within 24 hours! 🎁<br/>Team GiftsNPrint</p>` });
        res.json({ success: true, message: 'Enquiry submitted! We will reply within 24 hours.' });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Failed to submit.' }); }
});

// POST /api/contact/quote
router.post('/quote', async (req, res) => {
    try {
        const { name, email, phone, company, product_name, quantity, specifications, budget_range, deadline, message } = req.body;
        await db.execute(
            'INSERT INTO enquiries (name, email, phone, company, enquiry_type, subject, message, quantity, budget_range) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, email, phone, company, 'quote', `Quote: ${product_name}`,
             `Product: ${product_name}\nQty: ${quantity}\nSpecs: ${specifications}\nDeadline: ${deadline}\n${message}`, quantity, budget_range]
        );
        await transporter.sendMail({ from: process.env.EMAIL_FROM, to: process.env.ADMIN_EMAIL, subject: `Quote Request: ${product_name} - ${name}`,
            html: `<p><b>${name}</b> | ${email} | ${phone}<br/>Product: ${product_name}<br/>Qty: ${quantity}<br/>Budget: ${budget_range}<br/>Deadline: ${deadline}<br/>${specifications}<br/>${message}</p>` });
        res.json({ success: true, message: 'Quote request submitted! We will reply within 4 hours.' });
    } catch (err) { res.status(500).json({ success: false, message: 'Failed to submit.' }); }
});

// POST /api/contact/newsletter
router.post('/newsletter', async (req, res) => {
    try {
        const { email, name } = req.body;
        await db.execute('INSERT IGNORE INTO newsletter_subscribers (email, name) VALUES (?, ?)', [email, name||null]);
        res.json({ success: true, message: 'Subscribed successfully!' });
    } catch (err) { res.status(500).json({ success: false, message: 'Subscription failed.' }); }
});

// GET /api/contact/chatbot
router.get('/chatbot', (req, res) => {
    const msg = (req.query.message || '').toLowerCase();
    let response;
    if (msg.includes('price') || msg.includes('cost') || msg.includes('rate'))
        response = { text: 'Our prices depend on product and quantity. More you order, better the price! 💰', buttons: [{ text: 'Get Quote', url: '/quote.html' }, { text: 'WhatsApp Us', url: 'https://wa.me/91XXXXXXXXXX' }] };
    else if (msg.includes('delivery') || msg.includes('shipping'))
        response = { text: 'Standard delivery is 3-7 working days. We ship all over India! 🚚', buttons: [{ text: 'Contact Us', url: '/contact.html' }] };
    else if (msg.includes('banner') || msg.includes('flex') || msg.includes('vinyl') || msg.includes('print'))
        response = { text: 'We offer premium flex banners, vinyl, standees, hoardings and more! 🖨️', buttons: [{ text: 'View Printing', url: '/category/printing.html' }, { text: 'Get Quote', url: '/quote.html' }] };
    else if (msg.includes('trophy') || msg.includes('award') || msg.includes('memento'))
        response = { text: 'We create stunning trophies, crystal awards, acrylic mementos and plaques! 🏆', buttons: [{ text: 'View Awards', url: '/category/awards.html' }] };
    else if (msg.includes('mug') || msg.includes('shirt') || msg.includes('gift') || msg.includes('promotional'))
        response = { text: 'We offer customized mugs, t-shirts, pens, diaries and gift hampers! 🎁', buttons: [{ text: 'View Gifts', url: '/category/promotional.html' }] };
    else if (msg.includes('bulk') || msg.includes('corporate') || msg.includes('b2b'))
        response = { text: 'We specialize in bulk and corporate orders with special pricing! 🏢', buttons: [{ text: 'Get Bulk Quote', url: '/quote.html' }, { text: 'WhatsApp', url: 'https://wa.me/91XXXXXXXXXX' }] };
    else if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey'))
        response = { text: 'Hello! Welcome to GiftsNPrint! 👋 How can I help you today?', buttons: [{ text: 'Our Products', url: '/products.html' }, { text: 'Get Quote', url: '/quote.html' }] };
    else if (msg.includes('contact') || msg.includes('phone') || msg.includes('call'))
        response = { text: '📞 Call/WhatsApp: +91 XXXXXXXXXX\n📧 info@giftsnprint.com\n🕐 Mon-Sat 9AM-7PM', buttons: [{ text: 'Contact Page', url: '/contact.html' }] };
    else
        response = { text: 'For detailed help, connect with our team directly! Mon-Sat 9AM-7PM 😊', buttons: [{ text: 'WhatsApp Us', url: 'https://wa.me/91XXXXXXXXXX' }, { text: 'Get Quote', url: '/quote.html' }] };
    res.json({ success: true, response });
});

module.exports = router;
