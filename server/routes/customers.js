const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { sendEmail } = require('../services/email');

// Generate 6 digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// POST /api/customers/send-otp
router.post('/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60000); // 10 mins expiry

        // Delete old OTPs for this email to prevent spam
        await db.execute('DELETE FROM otps WHERE email = ?', [email]);
        
        // Insert new OTP
        await db.execute('INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?)', [email, otp, expiresAt]);

        // Send Email
        const html = `
            <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #2F3C7E;">GiftsNPrint Login</h2>
                <p>Your One-Time Password (OTP) to login is:</p>
                <h1 style="font-size: 32px; letter-spacing: 5px; color: #111;">${otp}</h1>
                <p>This code will expire in 10 minutes. Do not share it with anyone.</p>
            </div>
        `;
        await sendEmail({ to: email, subject: 'Your GiftsNPrint Login OTP', html });

        res.json({ success: true, message: 'OTP sent to ' + email });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/customers/verify-otp
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required' });

        const [rows] = await db.execute('SELECT * FROM otps WHERE email = ? AND otp = ? AND expires_at > NOW() ORDER BY id DESC LIMIT 1', [email, otp]);
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid or expired OTP' });
        }

        // OTP Valid. Clear it.
        await db.execute('DELETE FROM otps WHERE email = ?', [email]);

        // Find or create customer
        let [customers] = await db.execute('SELECT * FROM customers WHERE email = ?', [email]);
        let customer;
        if (customers.length === 0) {
            const [result] = await db.execute('INSERT INTO customers (email, name) VALUES (?, ?)', [email, email.split('@')[0]]);
            const [newCustomer] = await db.execute('SELECT * FROM customers WHERE id = ?', [result.insertId]);
            customer = newCustomer[0];
        } else {
            customer = customers[0];
        }

        // Create JWT
        const token = jwt.sign(
            { id: customer.id, email: customer.email, role: 'customer' },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({ success: true, token, customer });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/customers/me
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ success: false, message: 'No token' });
        
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const [rows] = await db.execute('SELECT id, name, email, phone, address FROM customers WHERE id = ?', [decoded.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Customer not found' });
        
        res.json({ success: true, customer: rows[0] });
    } catch (err) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
});

// PUT /api/customers/me
router.put('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ success: false, message: 'No token' });
        
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const { name, phone, address } = req.body;
        await db.execute('UPDATE customers SET name = ?, phone = ?, address = ? WHERE id = ?', [name, phone, address, decoded.id]);
        
        res.json({ success: true, message: 'Profile updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
