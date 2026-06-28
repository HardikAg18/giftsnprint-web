const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

// GET /api/coupons - List all coupons (admin)
router.get('/', auth, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM coupons ORDER BY created_at DESC');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/coupons/active - List active coupons for dropdowns
router.get('/active', auth, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id, code, description, discount_type, discount_value FROM coupons WHERE is_active = true ORDER BY id DESC');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/coupons/validate/:code - Validate coupon (public)
router.get('/validate/:code', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id, code, discount_type, discount_value, min_order_amount, first_order_only FROM coupons WHERE code = ? AND is_active = true', [req.params.code]);
        if (rows.length === 0) return res.json({ success: false, message: 'Invalid or inactive promocode.' });
        
        const coupon = rows[0];
        const email = req.query.email;
        
        if (coupon.first_order_only) {
            if (!email) {
                return res.json({ success: false, message: 'This coupon is only valid for your first order. Please enter your email first.' });
            }
            const [orders] = await db.execute(
                "SELECT id FROM orders WHERE customer_email = ? AND (payment_method != 'razorpay' OR payment_status = 'paid')",
                [email]
            );
            if (orders.length > 0) {
                return res.json({ success: false, message: 'This coupon is only valid for first-time customers.' });
            }
        }
        
        res.json({ success: true, data: coupon });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/coupons - Create coupon (admin)
router.post('/', auth, async (req, res) => {
    try {
        const { code, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, valid_from, valid_till, is_active, first_order_only } = req.body;
        const [result] = await db.execute(
            'INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, valid_from, valid_till, is_active, first_order_only) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [code, description || null, discount_type, discount_value, min_order_amount || 0, max_discount || null, usage_limit || null, valid_from || null, valid_till || null, is_active !== false, first_order_only === true || first_order_only === 1 || first_order_only === 'true']
        );
        res.json({ success: true, message: 'Coupon created', id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PUT /api/coupons/:id - Update coupon (admin)
router.put('/:id', auth, async (req, res) => {
    try {
        const { code, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, valid_from, valid_till, is_active, first_order_only } = req.body;
        await db.execute(
            'UPDATE coupons SET code=?, description=?, discount_type=?, discount_value=?, min_order_amount=?, max_discount=?, usage_limit=?, valid_from=?, valid_till=?, is_active=?, first_order_only=? WHERE id=?',
            [code, description || null, discount_type, discount_value, min_order_amount || 0, max_discount || null, usage_limit || null, valid_from || null, valid_till || null, is_active !== false, first_order_only === true || first_order_only === 1 || first_order_only === 'true', req.params.id]
        );
        res.json({ success: true, message: 'Coupon updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// DELETE /api/coupons/:id - Delete coupon
router.delete('/:id', auth, async (req, res) => {
    try {
        await db.execute('DELETE FROM coupons WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Coupon deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
