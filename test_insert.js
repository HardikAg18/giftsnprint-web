require('dotenv').config();
const db = require('./server/config/database');

async function run() {
    try {
        const category_id = "1";
        const name = "Flex Banner";
        const slug = "flex-banner";
        const short_description = "High-quality flex banner printing solutions for businesses, events, and outdoor adverti";
        const description = "gfrgrrvdfv";
        const base_price = "9";
        const min_order_qty = "1000";
        const unit_type = "sqft";
        const image_url = "";
        const tags = "";
        const is_featured = 0;
        const custom_options = undefined;

        console.log("Deleting test product...");
        const [result] = await db.execute("DELETE FROM products WHERE slug = 'flex-banner';");
        console.log("Success! Deleted test product.");
    } catch (err) {
        console.error("FAILED!", err);
    } finally {
        process.exit();
    }
}

run();
