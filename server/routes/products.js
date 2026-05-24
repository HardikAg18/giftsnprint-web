const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Note: Multer is removed for Serverless environments. Admin Panel will send Image URLs.

// GET /api/products - List all products (public)
router.get('/', async (req, res) => {
    try {
        const { category, featured, search, sort, page = 1, limit = 12 } = req.query;
        let query = `SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p 
                     JOIN categories c ON p.category_id = c.id WHERE p.is_active = TRUE`;
        const params = [];
        if (category) { query += ' AND c.slug = ?'; params.push(category); }
        if (featured === 'true') { query += ' AND p.is_featured = TRUE'; }
        if (search) { query += ' AND (p.name LIKE ? OR p.tags LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
        if (sort === 'price_asc') query += ' ORDER BY p.base_price ASC';
        else if (sort === 'price_desc') query += ' ORDER BY p.base_price DESC';
        else if (sort === 'popular') query += ' ORDER BY p.total_orders DESC';
        else query += ' ORDER BY p.is_featured DESC, p.created_at DESC';
        
        const offset = (page - 1) * limit;
        query += ` LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
        
        const [products] = await db.execute(query, params);
        
        // Get pricing tiers for each product
        for (let product of products) {
            const [tiers] = await db.execute('SELECT * FROM pricing_tiers WHERE product_id = ? ORDER BY min_qty', [product.id]);
            product.pricing_tiers = tiers;
        }
        
        res.json({ success: true, data: products });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// GET /api/products/categories - List all categories
router.get('/categories', async (req, res) => {
    try {
        const [categories] = await db.execute(
            'SELECT c.*, COUNT(p.id) as product_count FROM categories c LEFT JOIN products p ON c.id = p.category_id AND p.is_active = TRUE WHERE c.is_active = TRUE GROUP BY c.id ORDER BY c.sort_order'
        );
        res.json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// GET /api/products/:slug - Single product detail
router.get('/:slug', async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT p.*, c.name as category_name, c.slug as category_slug 
             FROM products p JOIN categories c ON p.category_id = c.id 
             WHERE p.slug = ? AND p.is_active = TRUE`,
            [req.params.slug]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Product not found.' });
        
        const product = rows[0];
        const [tiers] = await db.execute('SELECT * FROM pricing_tiers WHERE product_id = ? ORDER BY min_qty', [product.id]);
        product.pricing_tiers = tiers;
        
        // Get approved reviews
        const [reviews] = await db.execute(
            'SELECT * FROM reviews WHERE product_id = ? AND is_approved = TRUE ORDER BY created_at DESC LIMIT 10',
            [product.id]
        );
        product.reviews = reviews;
        
        // Related products
        const [related] = await db.execute(
            'SELECT id, name, slug, base_price, image_url, rating FROM products WHERE category_id = ? AND id != ? AND is_active = TRUE LIMIT 4',
            [product.category_id, product.id]
        );
        product.related_products = related;
        
        res.json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Admin routes below - protected
// POST /api/products - Create product
router.post('/', auth, async (req, res) => {
    try {
        const { category_id, name, short_description, description, base_price, min_order_qty, unit_type, tags, is_featured, image_url, pricing_tiers, custom_options } = req.body;
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        const [result] = await db.execute(
            'INSERT INTO products (category_id, name, slug, short_description, description, base_price, min_order_qty, unit_type, image_url, tags, is_featured, custom_options) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [category_id, name, slug, short_description, description, base_price, min_order_qty || 1, unit_type || 'pcs', image_url || null, tags, is_featured ? 1 : 0, custom_options || null]
        );
        
        const productId = result.insertId;
        if (pricing_tiers) {
            const tiers = JSON.parse(pricing_tiers);
            for (const tier of tiers) {
                await db.execute(
                    'INSERT INTO pricing_tiers (product_id, min_qty, max_qty, price_per_unit, label) VALUES (?, ?, ?, ?, ?)',
                    [productId, tier.min_qty, tier.max_qty || null, tier.price_per_unit, tier.label]
                );
            }
        }
        res.json({ success: true, message: 'Product created.', productId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// PUT /api/products/:id - Update product
router.put('/:id', auth, async (req, res) => {
    try {
        const { category_id, name, short_description, description, base_price, min_order_qty, unit_type, tags, is_featured, is_active, image_url, pricing_tiers, custom_options } = req.body;
        const updates = { category_id, name, short_description, description, base_price, min_order_qty, unit_type: unit_type || 'pcs', tags, is_featured: is_featured ? 1 : 0, is_active: is_active ? 1 : 0 };
        if (image_url) updates.image_url = image_url;
        if (custom_options !== undefined) updates.custom_options = custom_options || null;
        
        const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        await db.execute(`UPDATE products SET ${fields} WHERE id = ?`, [...Object.values(updates), req.params.id]);
        
        if (pricing_tiers) {
            await db.execute('DELETE FROM pricing_tiers WHERE product_id = ?', [req.params.id]);
            const tiers = JSON.parse(pricing_tiers);
            for (const tier of tiers) {
                await db.execute(
                    'INSERT INTO pricing_tiers (product_id, min_qty, max_qty, price_per_unit, label) VALUES (?, ?, ?, ?, ?)',
                    [req.params.id, tier.min_qty, tier.max_qty || null, tier.price_per_unit, tier.label]
                );
            }
        }
        res.json({ success: true, message: 'Product updated.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// DELETE /api/products/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        await db.execute('UPDATE products SET is_active = FALSE WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Product deleted.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
