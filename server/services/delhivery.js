const DELHIVERY_API_KEY = 'f21104e6bdb7915c22768ac428f07a90bba281f3';
const CLIENT_ID = 'hardik4081@gmail.com';
const API_BASE = 'https://track.delhivery.com/api/cmu/create.json'; // production url

/**
 * Pushes an order to Delhivery and returns the AWB (Tracking ID)
 */
async function pushOrderToDelhivery(orderData) {
    try {
        // Sanitize phone number (remove country code +91 and symbols, must be 10-digit number for Delhivery)
        let phone = orderData.customer_phone || '';
        phone = phone.replace(/\D/g, ''); // strip non-digits
        if (phone.length === 12 && phone.startsWith('91')) {
            phone = phone.substring(2); // strip leading 91
        }
        if (phone.length > 10) {
            phone = phone.substring(phone.length - 10); // get last 10 digits
        }

        const payload = {
            format: "json",
            data: {
                shipments: [{
                    add: orderData.shipping_address,
                    address_type: "home",
                    phone: phone,
                    payment_mode: orderData.payment_method === 'cod' ? 'COD' : 'Pre-paid',
                    name: orderData.customer_name,
                    pin: orderData.pincode,
                    order: orderData.order_id,
                    cod_amount: orderData.payment_method === 'cod' ? orderData.total_amount : 0,
                    weight: 500, // Default 500g for now
                    shipping_mode: "Surface"
                }],
                pickup_location: {
                    name: "Vikalp Advertising", // Required pickup point matching your Delhivery dashboard
                    add: "Mansarovar",
                    city: "Jaipur",
                    pin: "302020",
                    country: "India",
                    phone: "9999999999"
                }
            }
        };

        if (orderData.pickup_date) {
            payload.data.pickup_date = orderData.pickup_date;
        }
        if (orderData.pickup_time) {
            payload.data.pickup_time = orderData.pickup_time;
        }

        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Token ${DELHIVERY_API_KEY}`
            },
            body: `format=json&data=${encodeURIComponent(JSON.stringify(payload.data))}`
        });

        const text = await response.text();
        let result;
        try { result = JSON.parse(text); } catch(e) { result = text; }

        console.log("Delhivery API Response:", JSON.stringify(result, null, 2));

        if (result.packages && result.packages.length > 0) {
            const pkg = result.packages[0];
            if (pkg.status === 'Success' && pkg.waybill) {
                return { success: true, tracking_id: pkg.waybill };
            } else {
                const remark = pkg.remarks && pkg.remarks.length > 0 ? pkg.remarks.join(', ') : (result.rmk || 'Unknown Delhivery error');
                return { success: false, error: remark };
            }
        } else {
            const remark = result.rmk || 'Failed to generate tracking ID from Delhivery. Verify settings.';
            return { success: false, error: remark };
        }

    } catch (err) {
        console.error("Delhivery Integration Error:", err);
        return { success: false, error: err.message || 'Connection to Delhivery failed.' };
    }
}

module.exports = { pushOrderToDelhivery };
