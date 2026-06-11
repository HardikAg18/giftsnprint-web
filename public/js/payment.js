// payment.js — GiftsNPrint Razorpay integration
const API_BASE = '/api';
const CART_KEY = 'gnp_cart';

function getCart() { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }

async function initCheckout() {
  if (!localStorage.getItem('gnp_customer_token')) {
    window.location.href = '/login.html?redirect=/checkout.html';
    return;
  }
  
  const form = document.getElementById('checkoutForm');
  if (!form) return;

  const cart = getCart();
  if (!cart.length) { window.location.href = '/cart.html'; return; }

  let appliedDiscount = 0;
  let currentPromoCode = '';

window.updateCheckoutCart = function(index, delta) {
    const newQty = cart[index].qty + delta;
    if (newQty <= 0) {
      cart.splice(index, 1);
    } else {
      cart[index].qty = newQty;
    }
    localStorage.setItem('gnp_cart', JSON.stringify(cart));
    if (cart.length === 0) {
      window.location.href = '/cart.html';
    } else {
      renderSummary();
      updateCartBadge(); // from main.js if accessible
    }
  };

  function renderSummary() {
    const summaryEl = document.getElementById('orderSummary');
    if (!summaryEl) return;
    
    const paymentMethod = document.getElementById('paymentMethod')?.value || 'razorpay';
    const codFee = paymentMethod === 'cod' ? 50 : 0;
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const gst = Math.round(cart.reduce((s, i) => s + (i.price * i.qty * (parseFloat(i.gst_percent) || 18) / 100), 0));
    const shipping = subtotal >= 1000 ? 0 : 99;
    let total = subtotal + gst + shipping + codFee - appliedDiscount;
    if (total < 0) total = 0;

    summaryEl.classList.remove('loader');
    summaryEl.innerHTML = `
      ${cart.map((i, index) => `
        <div class="summary-item" style="display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; justify-content:space-between; width:100%;">
            <span>${i.name}</span>
            <span>₹${(i.price * i.qty).toLocaleString('en-IN')}</span>
          </div>
          <div style="display:flex; align-items:center; gap:10px; font-size:14px;">
            <button onclick="updateCheckoutCart(${index}, -1)" style="border:1px solid var(--border); background:var(--surface); padding:2px 8px; border-radius:4px; cursor:pointer;">-</button>
            <span>${i.qty}</span>
            <button onclick="updateCheckoutCart(${index}, 1)" style="border:1px solid var(--border); background:var(--surface); padding:2px 8px; border-radius:4px; cursor:pointer;">+</button>
            <button onclick="updateCheckoutCart(${index}, -${i.qty})" style="color:var(--error); background:none; border:none; font-size:12px; cursor:pointer; margin-left:10px;"><i class="ri-delete-bin-line"></i> Remove</button>
          </div>
        </div>`).join('')}
      <div class="summary-divider"></div>
      <div class="summary-item"><span>Subtotal</span><span>₹${subtotal.toLocaleString('en-IN')}</span></div>
      <div class="summary-item"><span>GST</span><span>₹${gst.toLocaleString('en-IN')}</span></div>
      <div class="summary-item"><span>Shipping</span><span>${shipping === 0 ? 'FREE 🎉' : '₹' + shipping}</span></div>
      ${codFee > 0 ? `<div class="summary-item"><span>COD Handling</span><span>₹${codFee}</span></div>` : ''}
      ${appliedDiscount > 0 ? `<div class="summary-item" style="color:var(--green)"><span>Discount</span><span>-₹${appliedDiscount.toLocaleString('en-IN')}</span></div>` : ''}
      <div class="summary-total"><span>Total</span><span>₹${total.toLocaleString('en-IN')}</span></div>
    `;
    document.getElementById('hiddenTotal').value = total;
  }

  renderSummary();

  const paymentMethodSelect = document.getElementById('paymentMethod');
  if (paymentMethodSelect) {
    paymentMethodSelect.addEventListener('change', () => {
      renderSummary();
      const btn = document.getElementById('payBtn');
      if (btn) {
        if (paymentMethodSelect.value === 'cod') {
          btn.innerHTML = 'Place Order <i class="fas fa-arrow-right"></i>';
        } else {
          btn.innerHTML = '<i class="fas fa-lock"></i> Pay Securely';
        }
      }
    });
  }

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
            currentPromoCode = code;
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
      const res = await fetch(`${API_BASE}/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        customer: { name: document.getElementById('checkoutName').value, email: document.getElementById('checkoutEmail').value, phone: document.getElementById('checkoutPhone').value },
        shipping_address: { address: document.getElementById('checkoutAddress').value, city: 'Local', state: 'Local', pincode: '000000' },
        items: cart,
        discount: appliedDiscount,
        coupon_code: currentPromoCode,
        payment_method: document.getElementById('paymentMethod').value
      })
      });

      const resData = await res.json();
      if (!resData.success) {
        showToast(resData.message || 'Payment initiation failed', 'error');
        btn.disabled = false; btn.innerHTML = '<i class="fas fa-lock"></i> Pay Securely with Razorpay';
        return;
      }

      if (resData.payment_method === 'cod') {
        localStorage.removeItem('gnp_cart');
        window.location.href = `/order-success.html?order=${resData.order_id}`;
        return;
      }

      // Open Razorpay
      const options = {
        key: resData.key,
        amount: resData.amount,
        currency: 'INR',
        name: 'GiftsNPrint',
        description: 'Custom Printing Order',
        image: '/images/hero_banner.png',
        order_id: resData.razorpay_order_id,
        prefill: { name: document.getElementById('checkoutName').value, email: document.getElementById('checkoutEmail').value, contact: document.getElementById('checkoutPhone').value },
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
                order_id: resData.order_id
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              localStorage.removeItem(CART_KEY);
              window.location.href = `/order-success.html?order=${resData.order_id}`;
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
