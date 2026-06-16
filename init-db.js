const fs = require('fs');
const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_oelmDK1abX9R@ep-noisy-cake-ao62dpag-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to Neon');
        
        const schema = fs.readFileSync('database/schema_postgres.sql', 'utf8');
        await client.query(schema);
        console.log('Schema created');

        await client.query(`
            INSERT INTO admin_users (username, email, password, role) 
            VALUES ('admin', 'info.giftsnprint@gmail.com', '$2a$10$VvEshvigaE5l2WMXTRudOu9I2NIWNWgt6v8AmpDRNWU4EWWUpsneK', 'super_admin') 
            ON CONFLICT (username) DO NOTHING;
        `);
        console.log('Admin user seeded');
        
        process.exit(0);
    } catch (e) {
        console.error('DB Init Error', e);
        process.exit(1);
    }
}
run();
