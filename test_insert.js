require('dotenv').config();
const db = require('./server/config/database');

async function run() {
    try {
        console.log("Cleaning up soft-deleted test products...");
        const [result] = await db.execute("DELETE FROM products WHERE name = 'Flex Banner'");
        console.log("Cleanup done:", result);
    } catch (err) {
        console.error("FAILED!", err);
    } finally {
        process.exit();
    }
}

run();
