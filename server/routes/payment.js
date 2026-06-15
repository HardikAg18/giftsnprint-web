const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../config/database');
const { sendEmail } = require('../services/email');
const { pushOrderToDelhivery } = require('../services/delhivery');
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
        
        // Extract pincode from address text if the frontend passed a default/invalid one
        let pincode = shipping_address.pincode || '000000';
        if (!/^\d{6}$/.test(pincode)) {
            const match = shipping_address.address.match(/\b\d{6}\b/);
            if (match) {
                pincode = match[0];
            }
        }
        
        // Calculate totals
        let subtotal = 0;
        let gst = 0;
        for (const item of items) {
            const itemTotal = item.price * item.qty;
            subtotal += itemTotal;
            gst += itemTotal * (parseFloat(item.gst_percent) || 18) / 100;
        }
        gst = Math.round(gst);
        
        let discount = 0;
        if (coupon_code) {
            const [coupons] = await db.execute(
                `SELECT * FROM coupons WHERE code = ? AND is_active = TRUE AND (valid_till IS NULL OR valid_till >= CURRENT_DATE) AND (usage_limit IS NULL OR used_count < usage_limit) AND min_order_amount <= ?`,
                [coupon_code, subtotal]
            );
            if (coupons.length > 0) {
                const coupon = coupons[0];
                discount = coupon.discount_type === 'percentage'
                    ? Math.min((subtotal * coupon.discount_value) / 100, coupon.max_discount || Infinity)
                    : coupon.discount_value;
            }
        }
        const shipping = subtotal >= 2000 ? 0 : 150;
        const codFee = req.body.payment_method === 'cod' ? 50 : 0;
        const total = subtotal + gst + shipping + codFee - discount;
        
        const isCOD = req.body.payment_method === 'cod';

        const orderId = `GNP-${Date.now()}`;
        
        if (isCOD) {
            await db.execute(
                `INSERT INTO orders (order_id, customer_name, customer_email, customer_phone, customer_company, shipping_address, city, state, pincode, items, subtotal, gst_amount, shipping_amount, discount_amount, total_amount, payment_method, payment_status, order_status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cod', 'pending', 'confirmed')`,
                [orderId, customer.name, customer.email, customer.phone, customer.company || null,
                 shipping_address.address, shipping_address.city, shipping_address.state, pincode,
                 JSON.stringify(items), subtotal, gst, shipping, discount, total]
            );

            // Send Confirmation Email to Customer
            const emailHtml = `<h2>Order Confirmed!</h2><p>Your Cash on Delivery order <b>${orderId}</b> for ₹${total} has been confirmed. We will begin processing your order right away and send you tracking details as soon as it ships.</p>`;
            await sendEmail({ to: customer.email, subject: `Order Confirmation - ${orderId}`, html: emailHtml });

            // Send Alert Email to Admin
            const adminEmailHtml = `
                <h2>New COD Order Placed!</h2>
                <p><b>Order ID:</b> ${orderId}</p>
                <p><b>Customer:</b> ${customer.name} (${customer.email}, ${customer.phone})</p>
                <p><b>Total Amount:</b> ₹${total} (Cash on Delivery)</p>
                <p><b>Address:</b> ${shipping_address.address}, ${shipping_address.city}, ${shipping_address.state} - ${pincode}</p>
                <p><a href="${process.env.SITE_URL || 'http://localhost:3000'}/admin">Go to Admin Dashboard</a></p>
            `;
            await sendEmail({
                to: process.env.ADMIN_EMAIL || 'admin@giftsnprint.com',
                subject: `ALERT: New COD Order Placed - ${orderId}`,
                html: adminEmailHtml
            });

            return res.json({ success: true, order_id: orderId, payment_method: 'cod' });
        }
        
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
        await db.execute(
            `INSERT INTO orders (order_id, customer_name, customer_email, customer_phone, customer_company, shipping_address, city, state, pincode, items, subtotal, gst_amount, shipping_amount, discount_amount, total_amount, razorpay_order_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [orderId, customer.name, customer.email, customer.phone, customer.company || null,
             shipping_address.address, shipping_address.city, shipping_address.state, pincode,
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
        
        // Fetch AWB from Delhivery
        const [orders] = await db.execute('SELECT * FROM orders WHERE order_id = ?', [order_id]);
        if (orders.length > 0) {
            const ord = orders[0];
            // Send confirmation email
            const emailHtml = `<h2>Payment Successful!</h2><p>Your order <b>${order_id}</b> has been paid and confirmed. We will begin processing your order right away and send you tracking details as soon as it ships.</p>`;
            await sendEmail({ to: ord.customer_email, subject: `Order Payment Successful - ${order_id}`, html: emailHtml });

            // Send Alert Email to Admin
            const adminEmailHtml = `
                <h2>New Prepaid Order Placed & Paid!</h2>
                <p><b>Order ID:</b> ${order_id}</p>
                <p><b>Customer:</b> ${ord.customer_name} (${ord.customer_email}, ${ord.customer_phone})</p>
                <p><b>Total Amount:</b> ₹${ord.total_amount} (Paid Online via Razorpay)</p>
                <p><b>Address:</b> ${ord.shipping_address}, ${ord.city}, ${ord.state} - ${ord.pincode}</p>
                <p><a href="${process.env.SITE_URL || 'http://localhost:3000'}/admin">Go to Admin Dashboard</a></p>
            `;
            await sendEmail({
                to: process.env.ADMIN_EMAIL || 'admin@giftsnprint.com',
                subject: `ALERT: New Prepaid Order Paid - ${order_id}`,
                html: adminEmailHtml
            });
        }
        
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
            `SELECT * FROM coupons WHERE code = ? AND is_active = TRUE AND (valid_till IS NULL OR valid_till >= CURRENT_DATE) AND (usage_limit IS NULL OR used_count < usage_limit)`,
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
