const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
}

// POST /api/payment/create-order
router.post('/create-order', async (req, res) => {
    try {
        const { items, customer, shipping_address, coupon_code } = req.body;
        
        // Calculate totals
        let subtotal = 0;
        for (const item of items) {
            subtotal += item.price * item.quantity;
        }
        
        let discount = 0;
        if (coupon_code) {
            const [coupons] = await db.execute(
                `SELECT * FROM coupons WHERE code = ? AND is_active = TRUE AND (valid_till IS NULL OR valid_till >= CURDATE()) AND (usage_limit IS NULL OR used_count < usage_limit) AND min_order_amount <= ?`,
                [coupon_code, subtotal]
            );
            if (coupons.length > 0) {
                const coupon = coupons[0];
                discount = coupon.discount_type === 'percentage'
                    ? Math.min((subtotal * coupon.discount_value) / 100, coupon.max_discount || Infinity)
                    : coupon.discount_value;
            }
        }
        
        const gst = Math.round((subtotal - discount) * 0.18);
        const shipping = subtotal >= 2000 ? 0 : 150;
        const total = Math.round(subtotal - discount + gst + shipping);
        
        // Create Razorpay order
        if (!razorpay) {
            return res.status(500).json({ success: false, message: 'Payment gateway is not configured.' });
        }
        
        const rzpOrder = await razorpay.orders.create({
            amount: total * 100, // paise
            currency: 'INR',
            receipt: `gnp_${Date.now()}`,
            notes: { customer_name: customer.name, customer_email: customer.email }
        });
        
        // Save pending order in DB
        const orderId = `GNP-${Date.now()}`;
        await db.execute(
            `INSERT INTO orders (order_id, customer_name, customer_email, customer_phone, customer_company, shipping_address, city, state, pincode, items, subtotal, gst_amount, shipping_amount, discount_amount, total_amount, razorpay_order_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [orderId, customer.name, customer.email, customer.phone, customer.company || null,
             shipping_address.address, shipping_address.city, shipping_address.state, shipping_address.pincode,
             JSON.stringify(items), subtotal, gst, shipping, discount, total, rzpOrder.id]
        );
        
        res.json({
            success: true,
            order_id: orderId,
            razorpay_order_id: rzpOrder.id,
            amount: total,
            key: process.env.RAZORPAY_KEY_ID,
            subtotal, gst, shipping, discount, total
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ success: false, message: 'Payment initialization failed.' });
    }
});

// POST /api/payment/verify
router.post('/verify', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;
        
        const sign = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSign = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(sign).digest('hex');
        
        if (razorpay_signature !== expectedSign) {
            await db.execute('UPDATE orders SET payment_status = ? WHERE order_id = ?', ['failed', order_id]);
            return res.status(400).json({ success: false, message: 'Payment verification failed.' });
        }
        
        await db.execute(
            'UPDATE orders SET payment_status = ?, razorpay_payment_id = ?, order_status = ? WHERE order_id = ?',
            ['paid', razorpay_payment_id, 'confirmed', order_id]
        );
        
        // Update coupon usage if used
        // Send confirmation email (handled by contact route)
        
        res.json({ success: true, message: 'Payment verified successfully.', order_id });
    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// GET /api/payment/order/:id - Get order status
router.get('/order/:id', async (req, res) => {
    try {
        const [orders] = await db.execute(
            'SELECT order_id, order_status, payment_status, total_amount, created_at, estimated_delivery, tracking_info FROM orders WHERE order_id = ?',
            [req.params.id]
        );
        if (orders.length === 0) return res.status(404).json({ success: false, message: 'Order not found.' });
        res.json({ success: true, data: orders[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// POST /api/payment/validate-coupon
router.post('/validate-coupon', async (req, res) => {
    try {
        const { code, order_amount } = req.body;
        const [coupons] = await db.execute(
            `SELECT * FROM coupons WHERE code = ? AND is_active = TRUE AND (valid_till IS NULL OR valid_till >= CURDATE()) AND (usage_limit IS NULL OR used_count < usage_limit)`,
            [code]
        );
        if (coupons.length === 0) return res.status(400).json({ success: false, message: 'Invalid or expired coupon.' });
        const coupon = coupons[0];
        if (order_amount < coupon.min_order_amount) {
            return res.status(400).json({ success: false, message: `Minimum order amount ₹${coupon.min_order_amount} required.` });
        }
        const discount = coupon.discount_type === 'percentage'
            ? Math.min((order_amount * coupon.discount_value) / 100, coupon.max_discount || Infinity)
            : coupon.discount_value;
        res.json({ success: true, discount: Math.round(discount), coupon: { code: coupon.code, description: coupon.description } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
