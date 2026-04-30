const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required.' });
        }
        const [rows] = await db.execute(
            'SELECT * FROM admin_users WHERE (username = ? OR email = ?) AND is_active = TRUE',
            [username, username]
        );
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
        const admin = rows[0];
        const isValid = await bcrypt.compare(password, admin.password);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
        await db.execute('UPDATE admin_users SET last_login = NOW() WHERE id = ?', [admin.id]);
        const token = jwt.sign(
            { id: admin.id, username: admin.username, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.json({
            success: true,
            token,
            admin: { id: admin.id, username: admin.username, email: admin.email, role: admin.role }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// POST /api/auth/change-password
router.post('/change-password', require('../middleware/auth'), async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const [rows] = await db.execute('SELECT * FROM admin_users WHERE id = ?', [req.admin.id]);
        const isValid = await bcrypt.compare(currentPassword, rows[0].password);
        if (!isValid) return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        const hashed = await bcrypt.hash(newPassword, 10);
        await db.execute('UPDATE admin_users SET password = ? WHERE id = ?', [hashed, req.admin.id]);
        res.json({ success: true, message: 'Password changed successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// POST /api/auth/setup - Create initial admin (run once)
router.post('/setup', async (req, res) => {
    try {
        const [existing] = await db.execute('SELECT COUNT(*) as count FROM admin_users');
        if (existing[0].count > 0) {
            return res.status(400).json({ success: false, message: 'Admin already exists.' });
        }
        const { username, email, password } = req.body;
        const hashed = await bcrypt.hash(password, 10);
        await db.execute(
            'INSERT INTO admin_users (username, email, password, role) VALUES (?, ?, ?, ?)',
            [username, email, hashed, 'super_admin']
        );
        res.json({ success: true, message: 'Admin created successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
