const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

// GET /api/orders - Admin: get all orders
router.get('/', auth, async (req, res) => {
    try {
        const { status, page = 1, limit = 20, search } = req.query;
        let query = 'SELECT * FROM orders WHERE 1=1';
        const params = [];
        if (status) { query += ' AND order_status = ?'; params.push(status); }
        if (search) { query += ' AND (order_id LIKE ? OR customer_name LIKE ? OR customer_email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        query += ' ORDER BY created_at DESC';
        const offset = (page - 1) * limit;
        query += ` LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
        const [orders] = await db.execute(query, params);
        const [total] = await db.execute('SELECT COUNT(*) as count FROM orders');
        res.json({ success: true, data: orders, total: total[0].count });
    } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// GET /api/orders/stats - Dashboard stats
router.get('/stats', auth, async (req, res) => {
    try {
        const [totalOrders] = await db.execute('SELECT COUNT(*) as count FROM orders');
        const [totalRevenue] = await db.execute("SELECT SUM(total_amount) as total FROM orders WHERE payment_status = 'paid'");
        const [pendingOrders] = await db.execute("SELECT COUNT(*) as count FROM orders WHERE order_status = 'pending'");
        const [totalCustomers] = await db.execute('SELECT COUNT(DISTINCT customer_email) as count FROM orders');
        const [recentOrders] = await db.execute('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5');
        const [monthlyRevenue] = await db.execute(`
            SELECT TO_CHAR(created_at, 'YYYY-MM') as month, SUM(total_amount) as revenue, COUNT(*) as orders
            FROM orders WHERE payment_status = 'paid' AND created_at >= NOW() - INTERVAL '6 MONTH'
            GROUP BY month ORDER BY month`);
        res.json({ success: true, stats: {
            totalOrders: totalOrders[0].count,
            totalRevenue: totalRevenue[0].total || 0,
            pendingOrders: pendingOrders[0].count,
            totalCustomers: totalCustomers[0].count,
            recentOrders, monthlyRevenue
        }});
    } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT /api/orders/:id/status - Update order status
router.put('/:id/status', auth, async (req, res) => {
    try {
        const { order_status, tracking_info, notes, estimated_delivery } = req.body;
        await db.execute(
            'UPDATE orders SET order_status = ?, tracking_info = ?, notes = ?, estimated_delivery = ? WHERE id = ?',
            [order_status, tracking_info||null, notes||null, estimated_delivery||null, req.params.id]
        );
        res.json({ success: true, message: 'Order status updated.' });
    } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// GET /api/orders/:id - Single order detail
router.get('/:id', auth, async (req, res) => {
    try {
        const [orders] = await db.execute('SELECT * FROM orders WHERE id = ? OR order_id = ?', [req.params.id, req.params.id]);
        if (!orders.length) return res.status(404).json({ success: false, message: 'Order not found.' });
        res.json({ success: true, data: orders[0] });
    } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
