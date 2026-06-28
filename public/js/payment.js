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

  // Initialize form caching
  const clearCheckoutCache = window.setupFormCache('checkoutForm', [
    'checkoutName', 'checkoutPhone', 'checkoutEmail', 'checkoutAddress', 'checkoutNotes',
    'paymentMethod', 'needGSTBill', 'checkoutGSTIN'
  ]);
  
  // Load Google Maps script
  loadGoogleMapsScript(initAutocomplete);

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
    const needGST = document.getElementById('needGSTBill')?.checked !== false;
    const gst = needGST ? Math.round(cart.reduce((s, i) => s + (i.price * i.qty * (parseFloat(i.gst_percent) || 18) / 100), 0)) : 0;
    const shipping = subtotal >= 999 ? 0 : 99;
    let total = subtotal + gst + shipping + codFee - appliedDiscount;
    if (total < 0) total = 0;

    let alertHtml = '';
    if (subtotal >= 999) {
      alertHtml = `
        <div class="shipping-alert success" style="background:#ecfdf5; border:1px solid #d1fae5; color:#047857; padding:12px; border-radius:12px; font-size:13.5px; font-weight:600; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
          <i class="fas fa-truck-fast" style="color:#10b981;"></i> <span>🎉 <b>Yayy! You got free shipping!</b></span>
        </div>`;
    } else {
      const remaining = 999 - subtotal;
      const pct = Math.min(100, (subtotal / 999) * 100);
      alertHtml = `
        <div class="shipping-alert info" style="background:#fffbeb; border:1px solid #fef3c7; color:#b45309; padding:12px; border-radius:12px; font-size:13.5px; font-weight:600; margin-bottom:16px; display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <i class="fas fa-shipping-fast" style="color:#d97706;"></i>
            <span>Add <b>₹${remaining.toLocaleString('en-IN')}</b> more to get free shipping!</span>
          </div>
          <div style="width:100%; height:6px; background:#e5e7eb; border-radius:3px; overflow:hidden;">
            <div style="width:${pct}%; height:100%; background:#f59e0b; border-radius:3px; transition: width 0.4s ease;"></div>
          </div>
        </div>`;
    }

    summaryEl.classList.remove('loader');
    summaryEl.innerHTML = `
      ${alertHtml}
      ${cart.map((i, index) => {
        const itemInclusivePrice = i.price * (1 + (parseFloat(i.gst_percent) || 18) / 100);
        return `
        <div class="summary-item" style="display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between; width:100%;">
            <span>${i.name}</span>
            <span>₹${(itemInclusivePrice * i.qty).toLocaleString('en-IN')}</span>
          </div>
          <div style="display:flex; align-items:center; gap:10px; font-size:14px; margin-top:2px;">
            <button onclick="updateCheckoutCart(${index}, -1)" style="border:1px solid var(--border); background:var(--surface); padding:2px 8px; border-radius:4px; cursor:pointer;">-</button>
            <span>${i.qty}</span>
            <button onclick="updateCheckoutCart(${index}, 1)" style="border:1px solid var(--border); background:var(--surface); padding:2px 8px; border-radius:4px; cursor:pointer;">+</button>
            <button onclick="updateCheckoutCart(${index}, -${i.qty})" style="color:var(--error); background:none; border:none; font-size:12px; cursor:pointer; margin-left:10px;"><i class="ri-delete-bin-line"></i> Remove</button>
          </div>
          ${i.no_return ? `<div style="font-size:11px;color:#EF4444;font-weight:600;margin-top:2px;margin-bottom:2px;"><i class="fas fa-exclamation-circle"></i> Non-Returnable</div>` : ''}
        </div>`;
      }).join('')}
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

  const needGSTCheckbox = document.getElementById('needGSTBill');
  const gstinGroup = document.getElementById('gstinGroup');
  if (needGSTCheckbox) {
    if (gstinGroup) {
      gstinGroup.style.display = needGSTCheckbox.checked ? 'block' : 'none';
    }
    needGSTCheckbox.addEventListener('change', () => {
      if (gstinGroup) {
        gstinGroup.style.display = needGSTCheckbox.checked ? 'block' : 'none';
      }
      renderSummary();
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
        const email = document.getElementById('checkoutEmail')?.value || '';
        const res = await fetch(`/api/coupons/validate/${code}?email=${encodeURIComponent(email)}`);
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

    let shippingDetails = window.parsedShippingDetails;
    if (!shippingDetails || shippingDetails.address !== document.getElementById('checkoutAddress').value) {
      const rawAddress = document.getElementById('checkoutAddress').value;
      let parsedPin = '000000';
      const match = rawAddress.match(/\b\d{6}\b/);
      if (match) parsedPin = match[0];
      
      shippingDetails = {
        address: rawAddress,
        city: 'Local',
        state: 'Local',
        pincode: parsedPin
      };
    }

    const needGST = document.getElementById('needGSTBill')?.checked !== false;
    const gstin = document.getElementById('checkoutGSTIN')?.value || '';
    const companyVal = needGST && gstin ? `GSTIN: ${gstin}` : '';

    try {
      // Create order on backend
      const res = await fetch(`${API_BASE}/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        customer: { name: document.getElementById('checkoutName').value, email: document.getElementById('checkoutEmail').value, phone: document.getElementById('checkoutPhone').value, company: companyVal },
        shipping_address: shippingDetails,
        items: cart,
        discount: appliedDiscount,
        coupon_code: currentPromoCode,
        payment_method: document.getElementById('paymentMethod').value,
        need_gst_bill: needGST
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
        clearCheckoutCache();
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
              clearCheckoutCache();
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

      // Update UI labels dynamically if this was a Cash on Delivery order
      if (o.payment_method === 'cod') {
        // Change "Amount Paid" to "Amount to Pay on Delivery"
        const amtLabel = document.getElementById('orderAmountDisplay').previousElementSibling;
        if (amtLabel) {
          amtLabel.textContent = 'Amount to Pay on Delivery';
        }
        
        // Change the success description paragraph text
        const descParagraph = document.querySelector('.container p');
        if (descParagraph) {
          descParagraph.textContent = "Thank you for your order! Your Cash on Delivery order is confirmed and will start processing right away.";
        }
      }
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

// Google Maps API integration
function loadGoogleMapsScript(callback) {
  const interval = setInterval(() => {
    if (window.SETTINGS && Object.keys(window.SETTINGS).length > 0) {
      clearInterval(interval);
      const key = window.SETTINGS.google_maps_api_key;
      if (!key) {
        console.warn('Google Maps API key is not configured in settings.');
        return;
      }
      
      if (document.getElementById('google-maps-script')) {
        if (callback) callback();
        return;
      }
      
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (callback) callback();
      };
      document.head.appendChild(script);
    }
  }, 100);
}

function initAutocomplete() {
  const addressInput = document.getElementById('checkoutAddress');
  if (!addressInput) return;
  
  const options = {
    componentRestrictions: { country: 'in' },
    fields: ['address_components', 'formatted_address', 'geometry']
  };
  
  const autocomplete = new google.maps.places.Autocomplete(addressInput, options);
  
  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    if (!place.address_components) return;
    
    let pincode = '';
    let city = '';
    let state = '';
    
    place.address_components.forEach(c => {
      const types = c.types;
      if (types.includes('postal_code')) {
        pincode = c.long_name;
      } else if (types.includes('locality')) {
        city = c.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        state = c.long_name;
      } else if (types.includes('administrative_area_level_2') && !city) {
        city = c.long_name;
      }
    });
    
    window.parsedShippingDetails = {
      address: place.formatted_address || addressInput.value,
      city: city || 'Local',
      state: state || 'Local',
      pincode: pincode || '000000'
    };
    
    addressInput.value = place.formatted_address;
    localStorage.setItem('cache_checkoutForm_checkoutAddress', place.formatted_address);
    
    if (pincode) {
      showToast(`Location verified! Pincode: ${pincode}`, 'success');
    } else {
      showToast(`Location selected, but pincode not found. Please type it in address.`, 'error');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initCheckout();
  loadOrderSuccess();
});
