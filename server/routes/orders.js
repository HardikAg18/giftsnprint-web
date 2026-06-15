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
        const [pendingOrders] = await db.execute("SELECT COUNT(*) as count FROM orders WHERE order_status IN ('pending', 'confirmed', 'processing')");
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

// POST /api/orders/:id/ship - Ship order with Delhivery (admin)
router.post('/:id/ship', auth, async (req, res) => {
    try {
        const { pickup_date, pickup_time } = req.body;
        if (!pickup_date) return res.status(400).json({ success: false, message: 'Pickup date is required.' });

        const [orders] = await db.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
        if (!orders.length) return res.status(404).json({ success: false, message: 'Order not found.' });
        
        const ord = orders[0];
        if (ord.tracking_id) {
            return res.status(400).json({ success: false, message: 'Order has already been manifested/shipped.' });
        }

        const { pushOrderToDelhivery } = require('../services/delhivery');
        const { sendEmail } = require('../services/email');

        // Call Delhivery API
        const delhiveryResult = await pushOrderToDelhivery({
            order_id: ord.order_id,
            customer_name: ord.customer_name,
            customer_phone: ord.customer_phone,
            shipping_address: ord.shipping_address,
            pincode: ord.pincode,
            payment_method: ord.payment_method,
            total_amount: ord.total_amount,
            pickup_date,
            pickup_time
        });

        if (!delhiveryResult.success) {
            return res.status(500).json({ success: false, message: delhiveryResult.error });
        }

        const awb = delhiveryResult.tracking_id;

        // Update database
        await db.execute(
            'UPDATE orders SET tracking_id = ?, order_status = ?, estimated_delivery = ? WHERE id = ?',
            [awb, 'shipped', pickup_date, req.params.id]
        );

        // Send Email notification to customer
        const trackingUrl = `https://www.delhivery.com/track/package/${awb}`;
        const emailHtml = `
            <h2>Your Order has been Shipped!</h2>
            <p>Hello ${ord.customer_name},</p>
            <p>Good news! Your order <b>${ord.order_id}</b> has been handed over to our delivery partner, Delhivery.</p>
            <p><b>Tracking ID (AWB):</b> ${awb}</p>
            <p>You can track your package details here: <a href="${trackingUrl}">${trackingUrl}</a></p>
            <br>
            <p>Thank you for shopping with GiftsNPrint!</p>
        `;
        await sendEmail({
            to: ord.customer_email,
            subject: `Your GiftsNPrint Order ${ord.order_id} has been Shipped!`,
            html: emailHtml
        });

        res.json({ success: true, message: 'Order successfully shipped with Delhivery.', tracking_id: awb });
    } catch (err) {
        console.error('Ship order error:', err);
        res.status(500).json({ success: false, message: 'Server error during shipment processing.' });
    }
});

// DELETE /api/orders/:id - Admin: delete order
router.delete('/:id', auth, async (req, res) => {
    try {
        const [result] = await db.execute('DELETE FROM orders WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Order deleted successfully.' });
    } catch (err) {
        console.error('Delete order error:', err);
        res.status(500).json({ success: false, message: 'Server error during order deletion.' });
    }
});

module.exports = router;
