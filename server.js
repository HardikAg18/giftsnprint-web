require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Create uploads directory (Ignore on Serverless/Vercel read-only FS)
try {
    const uploadsDir = path.join(__dirname, 'public', 'uploads', 'products');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
} catch (e) {
    console.log('Skipping uploads directory creation on Serverless environment');
}

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
    origin: process.env.SITE_URL || '*',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const strictLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/api/', limiter);
app.use('/api/contact', strictLimiter);
app.use('/api/auth', strictLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./server/routes/auth'));
app.use('/api/products', require('./server/routes/products'));
app.use('/api/orders', require('./server/routes/orders'));
app.use('/api/payment', require('./server/routes/payment'));
app.use('/api/contact', require('./server/routes/contact'));
app.use('/api/reviews', require('./server/routes/reviews'));
app.use('/api/settings', require('./server/routes/settings'));
app.use('/api/customers', require('./server/routes/customers'));
app.use('/api/coupons', require('./server/routes/coupons'));

// Order tracking (public)
app.get('/api/track/:orderId', async (req, res) => {
    try {
        const db = require('./server/config/database');
        const [orders] = await db.execute(
            'SELECT order_id, customer_name, order_status, payment_status, total_amount, created_at, estimated_delivery, tracking_id FROM orders WHERE order_id = ?',
            [req.params.orderId]
        );
        if (!orders.length) return res.status(404).json({ success: false, message: 'Order not found.' });
        res.json({ success: true, data: orders[0] });
    } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// Serve admin panel
app.get('/admin/*', (req, res) => {
    const adminFile = req.path.replace('/admin/', '');
    const filePath = path.join(__dirname, 'public', 'admin', adminFile.includes('.html') ? adminFile : adminFile + '.html');
    if (fs.existsSync(filePath)) res.sendFile(filePath);
    else res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Internal server error.' });
});

// Server listen (only if not running on Vercel)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`\n🚀 GiftsNPrint server running on port ${PORT}`);
        console.log(`🌐 Website: http://localhost:${PORT}`);
        console.log(`🔧 Admin: http://localhost:${PORT}/admin`);
        console.log(`📚 API: http://localhost:${PORT}/api\n`);
    });
}

// Export for Vercel Serverless Functions
module.exports = app;
