const db = require('./server/config/database');

async function migrate() {
    try {
        console.log("Creating customers table...");
        await db.execute(`
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(20),
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log("Creating otps table...");
        await db.execute(`
            CREATE TABLE IF NOT EXISTS otps (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                otp VARCHAR(10) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log("Updating orders table...");
        try { await db.execute("ALTER TABLE orders ADD COLUMN customer_id INT DEFAULT NULL;"); } catch(e) {}
        try { await db.execute("ALTER TABLE orders ADD COLUMN tracking_id VARCHAR(255) DEFAULT NULL;"); } catch(e) {}
        try { await db.execute("ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50) DEFAULT 'online';"); } catch(e) {}
        try { await db.execute("ALTER TABLE orders ADD COLUMN shipping_status VARCHAR(100) DEFAULT 'pending';"); } catch(e) {}
        
        console.log("Migrations successful");
        process.exit(0);
    } catch(err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}
migrate();
