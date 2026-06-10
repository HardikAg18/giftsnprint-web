// cart.js — GiftsNPrint
const CART_KEY = 'gnp_cart';

function getCart() { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateCartBadge(); }

function renderCart() {
  const cart = getCart();
  const container = document.getElementById('cartItems');
  const emptyEl = document.getElementById('cartEmpty');
  const summaryEl = document.getElementById('cartSummary');
  if (!container) return;

  if (!cart.length) {
    container.innerHTML = '';
    emptyEl?.classList.remove('hidden');
    summaryEl?.classList.add('hidden');
    return;
  }
  emptyEl?.classList.add('hidden');
  summaryEl?.classList.remove('hidden');

  container.innerHTML = cart.map((item, idx) => `
    <div class="cart-item animate-fadeUp" data-idx="${idx}">
      <img src="${item.image || '/images/hero_banner.png'}" alt="${item.name}" class="cart-item-img" onerror="this.src='/images/hero_banner.png'">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        ${item.customization ? `<div class="cart-item-custom">${item.customization}</div>` : ''}
        <div class="cart-item-price">₹${(item.price * item.qty).toLocaleString('en-IN')}</div>
        <div class="cart-qty">
          <button class="qty-btn" onclick="changeQty(${idx},-1)"><i class="fas fa-minus"></i></button>
          <span class="qty-display">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${idx},1)"><i class="fas fa-plus"></i></button>
        </div>
      </div>
      <button class="cart-remove" onclick="removeItem(${idx})" title="Remove"><i class="fas fa-trash-alt"></i></button>
    </div>
  `).join('');

  // Summary
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const gst = Math.round(cart.reduce((s, i) => s + (i.price * i.qty * (parseFloat(i.gst_percent) || 18) / 100), 0));
  const shipping = subtotal >= 1000 ? 0 : 99;
  const total = subtotal + gst + shipping;

  document.getElementById('subtotalAmt').textContent = `₹${subtotal.toLocaleString('en-IN')}`;
  document.getElementById('gstAmt').textContent = `₹${gst.toLocaleString('en-IN')}`;
  document.getElementById('shippingAmt').textContent = shipping === 0 ? 'FREE' : `₹${shipping}`;
  document.getElementById('totalAmt').textContent = `₹${total.toLocaleString('en-IN')}`;
  document.getElementById('checkoutTotal').value = total;
}

window.changeQty = function(idx, delta) {
  const cart = getCart();
  cart[idx].qty = Math.max(1, cart[idx].qty + delta);
  saveCart(cart);
  renderCart();
};

window.removeItem = function(idx) {
  const cart = getCart();
  cart.splice(idx, 1);
  saveCart(cart);
  renderCart();
  showToast('Item removed from cart', 'error');
};

window.clearCart = function() {
  saveCart([]);
  renderCart();
};

document.getElementById('proceedCheckout')?.addEventListener('click', () => {
  const cart = getCart();
  if (!cart.length) return showToast('Your cart is empty!', 'error');
  window.location.href = '/checkout.html';
});

// Inject cart-specific styles
const s = document.createElement('style');
s.textContent = `
.hidden{display:none!important}
.cart-item-custom{font-size:12px;color:var(--text-muted);margin-bottom:4px}
.cart-remove{background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;padding:8px;border-radius:8px;transition:.2s;flex-shrink:0}
.cart-remove:hover{color:#EF4444;background:rgba(239,68,68,0.1)}
`;
document.head.appendChild(s);

document.addEventListener('DOMContentLoaded', renderCart);
