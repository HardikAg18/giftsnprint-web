const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dzfcmmhbj',
  api_key: process.env.CLOUDINARY_API_KEY || '587328894395133',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'gYy6JvPsO1enjTAGQqiZZ2NE9fA',
  secure: true
});

const upload = multer({ storage: multer.memoryStorage() });

// GET /api/products - List all products (public)
router.get('/', async (req, res) => {
    try {
        const { category, featured, search, sort, admin, page = 1, limit = 12 } = req.query;
        let query = `SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p 
                     JOIN categories c ON p.category_id = c.id`;
        if (admin !== 'true') {
            query += ` WHERE p.is_active = TRUE`;
        } else {
            query += ` WHERE 1=1`;
        }
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
        // Fetch active offer if attached
        if (product.offer_id) {
            const [coupons] = await db.execute('SELECT code, description, discount_type, discount_value FROM coupons WHERE id = ? AND is_active = TRUE', [product.offer_id]);
            if (coupons.length > 0) {
                product.offer = coupons[0];
            }
        }
        
        res.json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Admin routes below - protected
// POST /api/products/upload-image - Upload product image to Cloudinary
router.post('/upload-image', auth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file provided.' });
        
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'giftsnprint_products', resource_type: 'auto' },
            (error, result) => {
                if (error) return res.status(500).json({ success: false, message: 'Cloudinary upload failed.' });
                
                let optimizedUrl = result.secure_url;
                if (result.resource_type === 'image') {
                    optimizedUrl = cloudinary.url(result.public_id, { fetch_format: 'auto', quality: 'auto' });
                } else if (result.resource_type === 'video') {
                    optimizedUrl = cloudinary.url(result.public_id, { resource_type: 'video', fetch_format: 'auto', quality: 'auto' });
                }
                
                res.json({ success: true, url: optimizedUrl, resource_type: result.resource_type });
            }
        );
        uploadStream.end(req.file.buffer);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error during upload.' });
    }
});

// POST /api/products - Create product
router.post('/', auth, async (req, res) => {
    try {
        const { category_id, name, short_description, description, base_price, mrp, min_order_qty, unit_type, tags, is_featured, image_url, gallery_images, pricing_tiers, custom_options, offer_id, gst_percent } = req.body;
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        const [result] = await db.execute(
            'INSERT INTO products (category_id, name, slug, short_description, description, base_price, mrp, min_order_qty, unit_type, image_url, gallery_images, tags, is_featured, custom_options, offer_id, gst_percent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [category_id, name, slug, short_description, description, base_price, mrp || null, min_order_qty || 1, unit_type || 'pcs', image_url || null, gallery_images ? JSON.stringify(gallery_images) : null, tags, is_featured ? 1 : 0, custom_options || null, offer_id || null, gst_percent || 18.00]
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
        if (error.code === '23505' || error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'A product with this name already exists. Please choose a different name.' });
        }
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// PUT /api/products/:id - Update product
router.put('/:id', auth, async (req, res) => {
    try {
        const { category_id, name, short_description, description, base_price, mrp, min_order_qty, unit_type, tags, is_featured, is_active, image_url, gallery_images, pricing_tiers, custom_options, offer_id, gst_percent } = req.body;
        const updates = { category_id, name, short_description, description, base_price, mrp: mrp || null, min_order_qty, unit_type: unit_type || 'pcs', tags, is_featured: is_featured ? 1 : 0, is_active: is_active ? 1 : 0, offer_id: offer_id || null, gst_percent: gst_percent || 18.00 };
        if (image_url) updates.image_url = image_url;
        if (gallery_images !== undefined) updates.gallery_images = gallery_images ? JSON.stringify(gallery_images) : null;
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
        console.error(error);
        if (error.code === '23505' || error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'A product with this name already exists. Please choose a different name.' });
        }
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// DELETE /api/products/:id - Hard delete product permanently
router.delete('/:id', auth, async (req, res) => {
    try {
        await db.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Product deleted permanently.' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ success: false, message: 'Server error deleting product.' });
    }
});

// POST /api/products/categories - Create new category (admin only)
router.post('/categories', auth, async (req, res) => {
    try {
        const { name, description, icon, sort_order } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'Category name is required.' });
        }
        
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        const [result] = await db.execute(
            'INSERT INTO categories (name, slug, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)',
            [name, slug, description || null, icon || 'fa-box', sort_order || 0]
        );
        
        res.json({ success: true, message: 'Category created successfully.', categoryId: result.insertId });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ success: false, message: 'Server error creating category.' });
    }
});

// DELETE /api/products/categories/:id - Delete category (admin only)
router.delete('/categories/:id', auth, async (req, res) => {
    try {
        // Soft delete category by setting is_active = FALSE
        await db.execute('UPDATE categories SET is_active = FALSE WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Category deleted successfully.' });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ success: false, message: 'Server error deleting category.' });
    }
});

module.exports = router;
