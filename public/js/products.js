// products.js — GiftsNPrint product listing & detail
const API_BASE = '/api';

/* ── Product Listing Page ── */
async function loadProducts(params = {}) {
  const grid = document.getElementById('productsGrid');
  const loader = document.getElementById('productsLoader');
  if (!grid) return;

  loader?.classList.remove('hidden');
  grid.innerHTML = '';

  const qs = new URLSearchParams(params).toString();
  try {
    const res = await fetch(`${API_BASE}/products?${qs}`);
    const data = await res.json();
    loader?.classList.add('hidden');

    if (!data.success || !data.data.length) {
      grid.innerHTML = `<div class="no-products"><i class="fas fa-box-open"></i><p>No products found. Try a different filter.</p></div>`;
      return;
    }

    grid.innerHTML = data.data.map(p => `
      <div class="card animate-fadeUp" onclick="window.location.href='/product-detail.html?slug=${p.slug}'">
        <div class="card-img-wrap">
          <img src="${p.image_url || '/images/hero_banner.png'}" alt="${p.name}" class="card-img" loading="lazy" onerror="this.src='/images/hero_banner.png'">
          ${p.is_featured ? '<span class="card-badge">Featured</span>' : ''}
        </div>
        <div class="card-body">
          <div class="card-category">${p.category_name}</div>
          <h3 class="card-title">${p.name}</h3>
          <p class="card-desc">${p.short_description || ''}</p>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px">
            <div class="card-price">₹${Number(p.base_price).toLocaleString('en-IN')}<span class="card-price-unit">/unit</span></div>
            <div class="rating"><i class="fas fa-star"></i> ${p.rating || '4.8'}</div>
          </div>
        </div>
        <div class="card-footer">
          <span style="font-size:12px;color:var(--text-muted)">Min. ${p.min_order_qty || 25} units</span>
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();window.location.href='/product-detail.html?slug=${p.slug}'">View Details</button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.animate-fadeUp').forEach((el, i) => {
      el.style.animationDelay = `${i * 0.06}s`;
      el.classList.add('visible');
    });
  } catch (err) {
    loader?.classList.add('hidden');
    grid.innerHTML = `<div class="no-products"><i class="fas fa-wifi"></i><p>Connection error. Please refresh.</p></div>`;
  }
}

/* ── Filters ── */
function initFilters() {
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const categoryFilter = document.getElementById('categoryFilter');
  const params = new URLSearchParams(location.search);

  let activeParams = {
    category: params.get('category') || '',
    search: '',
    sort: 'default',
    page: 1,
    limit: 12
  };

  if (activeParams.category && categoryFilter) {
    categoryFilter.value = activeParams.category;
  }

  loadProducts(activeParams);

  let searchTimer;
  searchInput?.addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      activeParams.search = e.target.value;
      activeParams.page = 1;
      loadProducts(activeParams);
    }, 400);
  });

  sortSelect?.addEventListener('change', e => {
    activeParams.sort = e.target.value;
    loadProducts(activeParams);
  });

  categoryFilter?.addEventListener('change', e => {
    activeParams.category = e.target.value;
    activeParams.page = 1;
    loadProducts(activeParams);
  });
}

/* ── Product Detail Page ── */
async function loadProductDetail() {
  const slug = new URLSearchParams(location.search).get('slug');
  if (!slug || !document.getElementById('productName')) return;

  try {
    const res = await fetch(`${API_BASE}/products/${slug}`);
    const data = await res.json();
    if (!data.success) { window.location.href = '/404.html'; return; }
    const p = data.data;

    document.title = `${p.name} — GiftsNPrint`;
    document.getElementById('productName').textContent = p.name;
    document.getElementById('productCategory').textContent = p.category_name;
    document.getElementById('productDesc').textContent = p.description || p.short_description || '';
    document.getElementById('productPrice').textContent = `₹${Number(p.base_price).toLocaleString('en-IN')}`;
    document.getElementById('productRating').textContent = p.rating || '4.8';
    document.getElementById('productOrders').textContent = p.total_orders || '100';
    document.getElementById('minQty').value = p.min_order_qty || 25;
    document.getElementById('minQtyHint').textContent = `Minimum order: ${p.min_order_qty || 25} units`;

    const img = document.getElementById('productImage');
    if (img) { img.src = p.image_url || '/images/hero_banner.png'; img.alt = p.name; }

    // Breadcrumb
    const bc = document.getElementById('productBreadcrumb');
    if (bc) bc.innerHTML = `<a href="/">Home</a> <i class="fas fa-chevron-right"></i> <a href="/products.html?category=${p.category_slug}">${p.category_name}</a> <i class="fas fa-chevron-right"></i> <span>${p.name}</span>`;

    // Pricing tiers
    if (p.pricing_tiers?.length) {
      const tbody = document.getElementById('pricingTbody');
      if (tbody) {
        tbody.innerHTML = p.pricing_tiers.map(t => `
          <tr>
            <td>${t.min_qty}${t.max_qty ? '–' + t.max_qty : '+'}</td>
            <td class="price-highlight">₹${Number(t.price_per_unit).toFixed(2)}</td>
            <td>Save ${Math.round((1 - t.price_per_unit / p.base_price) * 100)}%</td>
          </tr>`).join('');
      }
    }

    // Related products
    if (p.related_products?.length) {
      const rel = document.getElementById('relatedGrid');
      if (rel) rel.innerHTML = p.related_products.map(r => `
        <div class="card" onclick="window.location.href='/product-detail.html?slug=${r.slug}'">
          <img src="${r.image_url || '/images/hero_banner.png'}" class="card-img" loading="lazy">
          <div class="card-body">
            <h4 class="card-title">${r.name}</h4>
            <div class="card-price">₹${Number(r.base_price).toLocaleString('en-IN')}/unit</div>
          </div>
        </div>`).join('');
    }

    // Add to cart
    const atcBtn = document.getElementById('addToCartBtn');
    atcBtn?.addEventListener('click', () => {
      const qty = parseInt(document.getElementById('minQty').value) || p.min_order_qty;
      const customization = document.getElementById('customizationNote')?.value || '';
      addToCart({ id: p.id, name: p.name, price: p.base_price, qty, image: p.image_url, slug: p.slug, customization });
    });

    // Quote
    const quoteBtn = document.getElementById('quoteBtn');
    quoteBtn?.addEventListener('click', () => {
      const qty = document.getElementById('minQty').value;
      window.location.href = `/quote.html?product=${encodeURIComponent(p.name)}&qty=${qty}`;
    });

    // Qty change updates price
    const qtyInput = document.getElementById('minQty');
    qtyInput?.addEventListener('change', () => {
      const qty = parseInt(qtyInput.value);
      if (p.pricing_tiers?.length) {
        let applicableTier = p.pricing_tiers[0];
        for (const t of p.pricing_tiers) {
          if (qty >= t.min_qty) applicableTier = t;
        }
        document.getElementById('productPrice').textContent = `₹${Number(applicableTier.price_per_unit).toFixed(2)}`;
      }
    });
  } catch (err) {
    console.error(err);
  }
}

// Inject product-specific CSS
const ps = document.createElement('style');
ps.textContent = `
.no-products{grid-column:1/-1;text-align:center;padding:80px 20px;color:var(--text-muted)}
.no-products i{font-size:48px;margin-bottom:16px;display:block;opacity:0.4}
.card-img-wrap{position:relative;overflow:hidden}
.card-badge{position:absolute;top:12px;left:12px;background:var(--grad);color:#fff;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;text-transform:uppercase}
.card-price-unit{font-size:13px;font-weight:400;color:var(--text-muted);margin-left:2px}
.hidden{display:none!important}
`;
document.head.appendChild(ps);

document.addEventListener('DOMContentLoaded', () => {
  initFilters();
  loadProductDetail();
});
