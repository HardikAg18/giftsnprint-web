require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { require: true }
});

async function run() {
    try {
        console.log("Adding mock categories so you can add products...");
        await pool.query(`
            INSERT INTO categories (id, name, slug, description, sort_order, is_active) VALUES 
            (1, 'Custom Printing', 'custom-printing', 'High quality custom printing', 1, true),
            (2, 'Corporate Gifts', 'corporate-gifts', 'Premium corporate gifts', 2, true),
            (3, 'Awards & Trophies', 'awards-trophies', 'Custom awards and trophies', 3, true),
            (4, 'Promotional Items', 'promotional-items', 'Promotional merchandise', 4, true),
            (5, 'Advanced Printing', 'advanced-printing', 'Advanced printing services', 5, true)
            ON CONFLICT (id) DO NOTHING;
        `);

        // Update sequence
        await pool.query(`SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));`);

        console.log("Database completely fixed and updated!");

    } catch (err) {
        console.error("FAILED!", err);
    } finally {
        pool.end();
        process.exit();
    }
}

run();
