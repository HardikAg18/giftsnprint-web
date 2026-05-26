require('dotenv').config();
const db = require('./server/config/database');

async function run() {
    try {
        console.log("Creating settings table...");
        await db.pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                setting_key VARCHAR(100) PRIMARY KEY,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("Inserting default settings...");
        await db.pool.query(`
            INSERT INTO settings (setting_key, setting_value) VALUES 
            ('business_name', 'GiftsNPrint'),
            ('phone', '+91 98765 43210'),
            ('email', 'info@giftsnprint.com'),
            ('whatsapp', '919876543210'),
            ('address', '123 Print Lane, Andheri West, Mumbai - 400053')
            ON CONFLICT (setting_key) DO NOTHING
        `);
        console.log("Settings table ready!");
    } catch (err) {
        console.error("FAILED!", err);
    } finally {
        process.exit();
    }
}

run();
