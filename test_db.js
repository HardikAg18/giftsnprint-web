const db = require('./server/config/database');
const req = {
    body: {
        category_id: 6,
        name: 'T-shirt',
        slug: 't-shirt',
        short_description: 'Not here to fit in. Built to stand out.',
        description: 'A bold oversized streetwear T-shirt...',
        base_price: 1000,
        mrp: null,
        min_order_qty: 1,
        unit_type: 'pcs',
        tags: '',
        is_featured: 0,
        image_url: '',
        gallery_images: [],
        pricing_tiers: null,
        custom_options: [],
        offer_id: null,
        gst_percent: 18
    }
};

async function test() {
    try {
        const { category_id, name, short_description, description, base_price, mrp, min_order_qty, unit_type, tags, is_featured, image_url, gallery_images, pricing_tiers, custom_options, offer_id, gst_percent } = req.body;
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        console.log("Values to insert:", [category_id, name, slug, short_description, description, base_price, mrp || null, min_order_qty || 1, unit_type || 'pcs', image_url || null, gallery_images ? JSON.stringify(gallery_images) : null, tags, is_featured ? 1 : 0, custom_options || null, offer_id || null, gst_percent || 18.00]);

        const [result] = await db.execute(
            'INSERT INTO products (category_id, name, slug, short_description, description, base_price, mrp, min_order_qty, unit_type, image_url, gallery_images, tags, is_featured, custom_options, offer_id, gst_percent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [category_id, name, slug, short_description, description, base_price, mrp || null, min_order_qty || 1, unit_type || 'pcs', image_url || null, gallery_images ? JSON.stringify(gallery_images) : null, tags, is_featured ? 1 : 0, custom_options || null, offer_id || null, gst_percent || 18.00]
        );
        console.log("Success", result);
        process.exit(0);
    } catch(e) {
        console.error("ERROR:", e);
        process.exit(1);
    }
}
test();
