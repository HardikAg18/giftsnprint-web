const DELHIVERY_API_KEY = 'f21104e6bdb7915c22768ac428f07a90bba281f3';
const CLIENT_ID = 'hardik4081@gmail.com';
const API_BASE = 'https://track.delhivery.com/api/cmu/create.json'; // production url

/**
 * Pushes an order to Delhivery and returns the AWB (Tracking ID)
 */
async function pushOrderToDelhivery(orderData) {
    try {
        const payload = {
            format: "json",
            data: {
                shipments: [{
                    add: orderData.shipping_address,
                    address_type: "home",
                    phone: orderData.customer_phone,
                    payment_mode: orderData.payment_method === 'cod' ? 'COD' : 'Pre-paid',
                    name: orderData.customer_name,
                    pin: orderData.pincode,
                    order: orderData.order_id,
                    cod_amount: orderData.payment_method === 'cod' ? orderData.total_amount : 0,
                    weight: 500, // Default 500g for now
                    shipping_mode: "Surface"
                }],
                pickup_location: {
                    name: "GiftsNPrint HQ", // Required pickup point
                    add: "Default pickup address",
                    city: "Delhi",
                    pin: "110001",
                    country: "India",
                    phone: "9999999999"
                }
            }
        };

        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${DELHIVERY_API_KEY}`
            },
            body: `format=json&data=${encodeURIComponent(JSON.stringify(payload.data))}`
        });

        const text = await response.text();
        let result;
        try { result = JSON.parse(text); } catch(e) { result = text; }

        console.log("Delhivery API Response:", result);

        if (result.packages && result.packages.length > 0) {
            return result.packages[0].waybill; // AWB tracking ID
        } else {
            console.error('Delhivery failed to generate AWB');
            return null;
        }

    } catch (err) {
        console.error("Delhivery Integration Error:", err);
        return null;
    }
}

module.exports = { pushOrderToDelhivery };
