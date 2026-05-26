const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

// GET /api/settings - Fetch all settings
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT setting_key, setting_value FROM settings');
        const settings = {};
        rows.forEach(r => settings[r.setting_key] = r.setting_value);
        res.json({ success: true, data: settings });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error fetching settings.' });
    }
});

// PUT /api/settings - Update settings (Admin only)
router.put('/', auth, async (req, res) => {
    try {
        const settings = req.body;
        
        // Settings is an object: { phone: '123', email: 'abc@abc.com' }
        for (const [key, value] of Object.entries(settings)) {
            await db.execute(
                `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) 
                 ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP`,
                [key, value]
            );
        }
        
        res.json({ success: true, message: 'Settings updated successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error updating settings.' });
    }
});

module.exports = router;
