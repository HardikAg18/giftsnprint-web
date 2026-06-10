// payment.js — GiftsNPrint Razorpay integration
const API_BASE = '/api';
const CART_KEY = 'gnp_cart';

function getCart() { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }

async function initCheckout() {
  const form = document.getElementById('checkoutForm');
  if (!form) return;

  const cart = getCart();
  if (!cart.length) { window.location.href = '/cart.html'; return; }

  let appliedDiscount = 0;

  function renderSummary() {
    const summaryEl = document.getElementById('orderSummary');
    if (!summaryEl) return;
    
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const gst = Math.round(subtotal * 0.18);
    const shipping = subtotal >= 1000 ? 0 : 99;
    let total = subtotal + gst + shipping - appliedDiscount;
    if (total < 0) total = 0;

    summaryEl.innerHTML = `
      ${cart.map(i => `
        <div class="summary-item">
          <span>${i.name} × ${i.qty}</span>
          <span>₹${(i.price * i.qty).toLocaleString('en-IN')}</span>
        </div>`).join('')}
      <div class="summary-divider"></div>
      <div class="summary-item"><span>Subtotal</span><span>₹${subtotal.toLocaleString('en-IN')}</span></div>
      <div class="summary-item"><span>GST (18%)</span><span>₹${gst.toLocaleString('en-IN')}</span></div>
      <div class="summary-item"><span>Shipping</span><span>${shipping === 0 ? 'FREE 🎉' : '₹' + shipping}</span></div>
      ${appliedDiscount > 0 ? `<div class="summary-item" style="color:var(--green)"><span>Discount</span><span>-₹${appliedDiscount.toLocaleString('en-IN')}</span></div>` : ''}
      <div class="summary-total"><span>Total</span><span>₹${total.toLocaleString('en-IN')}</span></div>
    `;
    document.getElementById('hiddenTotal').value = total;
  }

  renderSummary();

  const applyPromoBtn = document.getElementById('applyPromoBtn');
  if (applyPromoBtn) {
    applyPromoBtn.addEventListener('click', async () => {
      const code = document.getElementById('promoCodeInput').value.trim().toUpperCase();
      const msgEl = document.getElementById('promoMessage');
      if (!code) return;
      
      try {
        applyPromoBtn.disabled = true;
        applyPromoBtn.textContent = '...';
        const res = await fetch(`/api/coupons/validate/${code}`);
        const data = await res.json();
        
        if (data.success) {
          const c = data.data;
          const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
          if (subtotal < c.min_order_amount) {
            msgEl.style.display = 'block';
            msgEl.style.color = 'var(--red)';
            msgEl.textContent = `Minimum order amount for this coupon is ₹${c.min_order_amount}`;
            appliedDiscount = 0;
          } else {
            if (c.discount_type === 'percentage') {
              appliedDiscount = Math.round(subtotal * (c.discount_value / 100));
            } else {
              appliedDiscount = parseFloat(c.discount_value);
            }
            msgEl.style.display = 'block';
            msgEl.style.color = 'var(--green)';
            msgEl.textContent = `Promocode applied successfully!`;
          }
          renderSummary();
        } else {
          msgEl.style.display = 'block';
          msgEl.style.color = 'var(--red)';
          msgEl.textContent = data.message;
          appliedDiscount = 0;
          renderSummary();
        }
      } catch(e) {}
      applyPromoBtn.disabled = false;
      applyPromoBtn.textContent = 'Apply';
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('payBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    const formData = new FormData(form);
    const customerName = formData.get('name');
    const customerEmail = formData.get('email');
    const customerPhone = formData.get('phone');
    const address = formData.get('address');
    const cart = getCart();
    const total = parseInt(document.getElementById('hiddenTotal').value);

    try {
      // Create order on backend
      const orderRes = await fetch(`${API_BASE}/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          shipping_address: address,
          items: cart
        })
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.message);

      // Open Razorpay
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: 'INR',
        name: 'GiftsNPrint',
        description: 'Custom Printing Order',
        image: '/images/hero_banner.png',
        order_id: orderData.razorpay_order_id,
        prefill: { name: customerName, email: customerEmail, contact: customerPhone },
        theme: { color: '#7C3AED' },
        handler: async function(response) {
          // Verify payment
          try {
            const verifyRes = await fetch(`${API_BASE}/payment/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_id: orderData.order_id
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              localStorage.removeItem(CART_KEY);
              window.location.href = `/order-success.html?order=${orderData.order_id}`;
            } else {
              showToast('Payment verification failed. Contact support.', 'error');
              btn.disabled = false;
              btn.innerHTML = '<i class="fas fa-lock"></i> Pay Securely';
            }
          } catch (err) {
            showToast('Verification error. Please contact us.', 'error');
          }
        },
        modal: { ondismiss: () => {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-lock"></i> Pay Securely';
        }}
      };

      const rzp = new Razorpay(options);
      rzp.open();
    } catch (err) {
      showToast(err.message || 'Payment failed. Please try again.', 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-lock"></i> Pay Securely';
    }
  });
}

// Order success page
async function loadOrderSuccess() {
  const orderId = new URLSearchParams(location.search).get('order');
  if (!orderId || !document.getElementById('orderIdDisplay')) return;

  document.getElementById('orderIdDisplay').textContent = orderId;
  try {
    const res = await fetch(`/api/track/${orderId}`);
    const data = await res.json();
    if (data.success) {
      const o = data.data;
      document.getElementById('orderAmountDisplay').textContent = `₹${Number(o.total_amount).toLocaleString('en-IN')}`;
      document.getElementById('orderStatusDisplay').textContent = o.order_status;
      document.getElementById('orderCustomerDisplay').textContent = o.customer_name;
    }
  } catch (e) {}
}

// Inject payment-specific CSS
const ps = document.createElement('style');
ps.textContent = `
.summary-item{display:flex;justify-content:space-between;padding:8px 0;font-size:14px;color:var(--text-muted)}
.summary-total{display:flex;justify-content:space-between;padding:16px 0 0;font-size:18px;font-weight:700;color:var(--text);border-top:1px solid var(--border);margin-top:8px}
.summary-divider{border-top:1px dashed var(--border);margin:8px 0}
`;
document.head.appendChild(ps);

document.addEventListener('DOMContentLoaded', () => {
  initCheckout();
  loadOrderSuccess();
});
