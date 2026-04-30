const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

// GET /api/reviews - Get approved reviews (public)
router.get('/', async (req, res) => {
    try {
        const { product_id, featured } = req.query;
        let query = 'SELECT * FROM reviews WHERE is_approved = TRUE';
        const params = [];
        if (product_id) { query += ' AND product_id = ?'; params.push(product_id); }
        if (featured === 'true') query += ' AND is_featured = TRUE';
        query += ' ORDER BY created_at DESC LIMIT 20';
        const [reviews] = await db.execute(query, params);
        res.json({ success: true, data: reviews });
    } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// POST /api/reviews - Submit review (public)
router.post('/', async (req, res) => {
    try {
        const { product_id, order_id, customer_name, customer_email, rating, title, review_text } = req.body;
        if (!customer_name || !customer_email || !rating || !review_text) {
            return res.status(400).json({ success: false, message: 'All fields required.' });
        }
        await db.execute(
            'INSERT INTO reviews (product_id, order_id, customer_name, customer_email, rating, title, review_text) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [product_id||null, order_id||null, customer_name, customer_email, rating, title||null, review_text]
        );
        res.json({ success: true, message: 'Review submitted! It will be visible after admin approval.' });
    } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// GET /api/reviews/admin - All reviews for admin
router.get('/admin', auth, async (req, res) => {
    try {
        const [reviews] = await db.execute('SELECT r.*, p.name as product_name FROM reviews r LEFT JOIN products p ON r.product_id = p.id ORDER BY r.created_at DESC');
        res.json({ success: true, data: reviews });
    } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT /api/reviews/:id - Admin: approve/feature/reply
router.put('/:id', auth, async (req, res) => {
    try {
        const { is_approved, is_featured, admin_reply } = req.body;
        await db.execute(
            'UPDATE reviews SET is_approved = ?, is_featured = ?, admin_reply = ? WHERE id = ?',
            [is_approved ? 1 : 0, is_featured ? 1 : 0, admin_reply||null, req.params.id]
        );
        if (is_approved) {
            const [r] = await db.execute('SELECT product_id FROM reviews WHERE id = ?', [req.params.id]);
            if (r[0]?.product_id) {
                await db.execute('UPDATE products p SET rating = (SELECT AVG(rating) FROM reviews WHERE product_id = p.id AND is_approved = 1), total_reviews = (SELECT COUNT(*) FROM reviews WHERE product_id = p.id AND is_approved = 1) WHERE id = ?', [r[0].product_id]);
            }
        }
        res.json({ success: true, message: 'Review updated.' });
    } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// DELETE /api/reviews/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        await db.execute('DELETE FROM reviews WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Review deleted.' });
    } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
