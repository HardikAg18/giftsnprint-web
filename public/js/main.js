// GiftsNPrint - main.js
const API = '/api';
let WHATSAPP = '918769558589'; // Fallback
let SETTINGS = {};

/* ── Dynamic Settings ── */
async function loadDynamicSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.success && data.data) {
      SETTINGS = data.data;
      if (SETTINGS.whatsapp) WHATSAPP = SETTINGS.whatsapp.replace(/[^0-9]/g, '');
      
      // Inject into DOM
      document.querySelectorAll('[data-setting]').forEach(el => {
        const key = el.getAttribute('data-setting');
        if (SETTINGS[key]) {
          if (el.tagName === 'A' && key === 'phone') el.href = `tel:${SETTINGS[key].replace(/[^0-9+]/g, '')}`;
          else if (el.tagName === 'A' && key === 'email') el.href = `mailto:${SETTINGS[key]}`;
          
          // Only replace text content if the element isn't just an icon wrapper
          if (el.childNodes.length === 1 || !el.querySelector('i')) {
              el.textContent = SETTINGS[key];
          } else {
              // If there's an icon, we assume the text is right after it
              const icon = el.querySelector('i');
              el.innerHTML = '';
              el.appendChild(icon);
              el.appendChild(document.createTextNode(' ' + SETTINGS[key]));
          }
        }
      });
    }
  } catch(e) {}
}

async function populateCategoriesDropdown() {
  const dropdown = document.querySelector('.dropdown-menu');
  if (!dropdown) return;
  try {
    const res = await fetch('/api/products/categories');
    const data = await res.json();
    if (data.success && data.data) {
      const categoryIcons = {
        'custom-printing': 'fa-print',
        'corporate-gifts': 'fa-briefcase',
        'awards-trophies': 'fa-trophy',
        'promotional-items': 'fa-bullhorn',
        'advanced-printing': 'fa-layer-group',
        'express-collection': 'fa-shipping-fast'
      };
      
      let html = `<a href="/products.html"><i class="fas fa-boxes"></i> All Products</a>`;
      data.data.forEach(c => {
        const icon = c.icon || categoryIcons[c.slug] || 'fa-box';
        const link = ['custom-printing', 'corporate-gifts', 'awards-trophies', 'promotional-items', 'advanced-printing', 'express-collection'].includes(c.slug)
          ? `/category/${c.slug}.html`
          : `/products.html?category=${c.slug}`;
          
        html += `<a href="${link}"><i class="fas ${icon}"></i> ${c.name}</a>`;
      });
      dropdown.innerHTML = html;
    }
  } catch(e) {}
}

document.addEventListener('DOMContentLoaded', () => {
  loadDynamicSettings();
  populateCategoriesDropdown();
});

/* ── Navbar ── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar?.classList.toggle('scrolled', window.scrollY > 50);
});

/* ── Mobile Menu ── */
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
const mobileClose = document.getElementById('mobileClose');
hamburger?.addEventListener('click', () => mobileMenu?.classList.add('open'));
mobileClose?.addEventListener('click', () => mobileMenu?.classList.remove('open'));
mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));

/* ── Cart count badge ── */
function updateCartBadge() {
  const cart = JSON.parse(localStorage.getItem('gnp_cart') || '[]');
  const total = cart.reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll('.cart-count').forEach(el => el.textContent = total);
}
updateCartBadge();

/* ── Scroll-reveal animations ── */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
}, { threshold: 0.1 });
document.querySelectorAll('.animate-fadeUp').forEach(el => observer.observe(el));

/* ── Toast notification ── */
window.showToast = function(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${msg}`;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3000);
};

/* ── WhatsApp ── */
window.openWhatsApp = function(msg = 'Hello! I am interested in your printing services.') {
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
};

/* ── Active nav link ── */
const currentPage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(a => {
  if (a.getAttribute('href') === currentPage || (currentPage === '' && a.getAttribute('href') === 'index.html')) {
    a.classList.add('active');
  }
});

/* ── Lazy load images ── */
document.querySelectorAll('img[data-src]').forEach(img => {
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { img.src = img.dataset.src; io.disconnect(); }
  });
  io.observe(img);
});

/* ── Smooth counter animation ── */
function animateCounter(el) {
  const target = parseFloat(el.dataset.target);
  const suffix = el.dataset.suffix || '';
  const dur = 2000;
  const step = 16;
  const inc = target / (dur / step);
  let current = 0;
  const timer = setInterval(() => {
    current += inc;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = (Number.isInteger(target) ? Math.floor(current) : current.toFixed(1)) + suffix;
  }, step);
}
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { animateCounter(e.target); counterObserver.unobserve(e.target); } });
}, { threshold: 0.5 });
document.querySelectorAll('[data-target]').forEach(el => counterObserver.observe(el));

/* ── Add to cart helper ── */
window.addToCart = function(product, overrideQty = false) {
  let cart = JSON.parse(localStorage.getItem('gnp_cart') || '[]');
  const idx = cart.findIndex(i => i.id === product.id && i.customization === product.customization);
  if (idx > -1) {
    if (overrideQty) cart[idx].qty = product.qty;
    else cart[idx].qty += product.qty;
  }
  else cart.push(product);
  localStorage.setItem('gnp_cart', JSON.stringify(cart));
  updateCartBadge();
  showToast(`${product.name} added to cart!`);
};

/* ── Toast CSS injection ── */
const toastStyle = document.createElement('style');
toastStyle.textContent = `
.toast{position:fixed;bottom:100px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--surface);border:1px solid var(--border);color:var(--text);padding:12px 24px;border-radius:50px;font-size:14px;font-weight:600;z-index:9999;opacity:0;transition:.4s;display:flex;align-items:center;gap:8px;box-shadow:var(--shadow)}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
.toast-success i{color:#10B981}
.toast-error i{color:#EF4444}
.animate-fadeUp{opacity:0;transform:translateY(30px);transition:opacity .6s ease,transform .6s ease}
.animate-fadeUp.visible{opacity:1;transform:translateY(0)}
`;
document.head.appendChild(toastStyle);
