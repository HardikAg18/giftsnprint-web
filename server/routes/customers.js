const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

// GET /api/customers - Admin: Get all customers (extracted from orders and newsletter)
router.get('/', auth, async (req, res) => {
    try {
        const [ordersData] = await db.execute(`
            SELECT customer_name as name, customer_email as email, customer_phone as phone, 
                   COUNT(id) as total_orders, SUM(total_amount) as total_spent, MAX(created_at) as last_order_date 
            FROM orders GROUP BY customer_email, customer_name, customer_phone
        `);
        
        // Let's also fetch newsletter subscribers
        const [subscribers] = await db.execute('SELECT name, email, created_at as join_date FROM newsletter_subscribers');
        
        // Merge them nicely
        const customers = {};
        
        ordersData.forEach(o => {
            customers[o.email] = {
                name: o.name,
                email: o.email,
                phone: o.phone || '—',
                total_orders: o.total_orders,
                total_spent: o.total_spent || 0,
                last_active: o.last_order_date,
                is_subscriber: false
            };
        });
        
        subscribers.forEach(s => {
            if (customers[s.email]) {
                customers[s.email].is_subscriber = true;
            } else {
                customers[s.email] = {
                    name: s.name || 'Subscriber',
                    email: s.email,
                    phone: '—',
                    total_orders: 0,
                    total_spent: 0,
                    last_active: s.join_date,
                    is_subscriber: true
                };
            }
        });
        
        res.json({ success: true, data: Object.values(customers) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error fetching customers.' });
    }
});

module.exports = router;
