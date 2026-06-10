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
            <div class="card-price">₹${Number(p.base_price).toLocaleString('en-IN')}<span class="card-price-unit">/${p.unit_type || 'pcs'}</span></div>
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
    document.getElementById('productPrice').textContent = `₹${Number(p.base_price).toLocaleString('en-IN')} / ${p.unit_type || 'pcs'}`;
    document.getElementById('productRating').textContent = p.rating || '4.8';
    document.getElementById('productOrders').textContent = p.total_orders || '100';
    document.getElementById('minQtyHint').textContent = `Minimum order: ${p.min_order_qty || 1} ${p.unit_type || 'pcs'}`;

    const img = document.getElementById('productImage');
    const vid = document.getElementById('productVideo');
    if (img) { img.src = p.image_url || '/images/hero_banner.png'; img.alt = p.name; }

    // Setup Gallery
    let gallery = [];
    try { gallery = typeof p.gallery_images === 'string' ? JSON.parse(p.gallery_images) : (p.gallery_images || []); } catch(e){}
    
    if (p.image_url && !gallery.find(g => g.url === p.image_url)) {
      gallery.unshift({ url: p.image_url, resource_type: 'image' });
    }

    const galContainer = document.getElementById('mediaGallery');
    const pdfContainer = document.getElementById('pdfDownloadsContainer');
    
    if (galContainer && gallery.length > 0) {
      let galHTML = '';
      let pdfHTML = '';
      
      gallery.forEach((item, idx) => {
        if (item.resource_type === 'image') {
          galHTML += `<img src="${item.url}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid ${idx===0?'var(--accent)':'transparent'}" onclick="setMainMedia('${item.url}', 'image', this)">`;
        } else if (item.resource_type === 'video') {
          galHTML += `<div style="width:70px;height:70px;background:#000;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;border:2px solid transparent" onclick="setMainMedia('${item.url}', 'video', this)"><i class="fas fa-play"></i></div>`;
        } else if (item.resource_type === 'raw') {
          pdfHTML += `<a href="${item.url}" target="_blank" class="btn btn-outline" style="width:100%;justify-content:center;border-color:var(--primary);color:var(--text)"><i class="fas fa-file-pdf" style="color:#ef4444"></i> Download ${item.name || 'Spec Sheet'}</a>`;
        }
      });
      galContainer.innerHTML = galHTML;
      if (pdfContainer) pdfContainer.innerHTML = pdfHTML;
    }

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

    // Setup Quantity Dropdown
    const qtySelect = document.getElementById('qtySelect');
    if (qtySelect) {
      qtySelect.innerHTML = '';
      if (p.pricing_tiers && p.pricing_tiers.length > 0) {
        p.pricing_tiers.forEach((t, i) => {
          const opt = document.createElement('option');
          opt.value = t.min_qty;
          opt.dataset.price = t.price_per_unit;
          opt.innerHTML = `${t.min_qty} (₹${Number(t.price_per_unit).toFixed(2)} / unit) ${i === p.pricing_tiers.length-1 ? ' - Recommended' : ''}`;
          qtySelect.appendChild(opt);
        });
      } else {
        const minQ = p.min_order_qty || 1;
        qtySelect.innerHTML = `<option value="${minQ}" data-price="${p.base_price}">${minQ} (₹${p.base_price} / unit)</option>`;
      }
    }

    // Render Dynamic Options
    const dynContainer = document.getElementById('dynamicOptionsContainer');
    if (dynContainer && p.custom_options) {
      let optionsHtml = '';
      p.custom_options.forEach((opt, idx) => {
        optionsHtml += `
          <div>
            <label class="form-label">${opt.name}</label>
            <select class="form-control dyn-option-select" data-name="${opt.name}">
              ${opt.choices.map(c => `<option value="${c.label}" data-modifier="${c.price_modifier}">${c.label} ${c.price_modifier > 0 ? '(+₹'+c.price_modifier+')' : ''}</option>`).join('')}
            </select>
          </div>
        `;
      });
      dynContainer.innerHTML = optionsHtml;
    }

    // Add to cart
    const atcBtn = document.getElementById('addToCartBtn');
    atcBtn?.addEventListener('click', () => {
      const qty = parseInt(qtySelect.value);
      const customization = document.getElementById('customizationNote')?.value || '';
      addToCart({ id: p.id, name: p.name, price: window.currentCalculatedPrice || p.base_price, qty, image: p.image_url, slug: p.slug, customization });
    });

    // Quote
    const quoteBtn = document.getElementById('quoteBtn');
    quoteBtn?.addEventListener('click', () => {
      const qty = qtySelect.value;
      window.location.href = `/quote.html?product=${encodeURIComponent(p.name)}&qty=${qty}`;
    });

    // Calculate Total Price
    const customSizeContainer = document.getElementById('customSizeContainer');
    const customW = document.getElementById('customWidth');
    const customH = document.getElementById('customHeight');

    function calculateTotal() {
      const qty = parseInt(qtySelect.value) || 1;
      const selectedTierOpt = qtySelect.options[qtySelect.selectedIndex];
      let baseUnitPrice = selectedTierOpt ? parseFloat(selectedTierOpt.dataset.price) : parseFloat(p.base_price);
      
      let modifiers = 0;
      let isCustomSize = false;
      
      document.querySelectorAll('.dyn-option-select').forEach(sel => {
        const choiceOpt = sel.options[sel.selectedIndex];
        if (choiceOpt) {
          modifiers += parseFloat(choiceOpt.dataset.modifier || 0);
          if (choiceOpt.value.toLowerCase() === 'custom') isCustomSize = true;
        }
      });

      if (customSizeContainer) {
        customSizeContainer.classList.toggle('hidden', !isCustomSize);
      }

      let areaMultiplier = 1;
      if (isCustomSize && customW && customH) {
        const w = parseFloat(customW.value) || 1;
        const h = parseFloat(customH.value) || 1;
        // Basic area calc (w * h / 100) as an example multiplier
        areaMultiplier = (w * h) / 100;
        if (areaMultiplier < 1) areaMultiplier = 1;
      }

      const finalUnitPrice = (baseUnitPrice + modifiers) * areaMultiplier;
      window.currentCalculatedPrice = finalUnitPrice;
      
      document.getElementById('productPrice').textContent = `₹${finalUnitPrice.toLocaleString('en-IN', {maximumFractionDigits:2})} / ${p.unit_type || 'pcs'}`;
      const total = (finalUnitPrice * qty).toLocaleString('en-IN', { maximumFractionDigits: 2 });
      document.getElementById('totalPriceDisplay').textContent = `Total: ₹${total}`;
    }
    
    qtySelect?.addEventListener('change', calculateTotal);
    customW?.addEventListener('input', calculateTotal);
    customH?.addEventListener('input', calculateTotal);
    document.querySelectorAll('.dyn-option-select').forEach(el => el.addEventListener('change', calculateTotal));
    
    calculateTotal(); // initial calculation
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
  if (typeof initFilters === 'function') initFilters();
  if (typeof loadProducts === 'function') loadProducts();
  loadProductDetail();
});

window.setMainMedia = function(url, type, el) {
  const img = document.getElementById('productImage');
  const vid = document.getElementById('productVideo');
  if (type === 'image') {
    img.src = url;
    img.style.display = 'block';
    if(vid) { vid.style.display = 'none'; vid.pause(); }
  } else if (type === 'video') {
    if(vid) {
      vid.src = url;
      vid.style.display = 'block';
      vid.play();
    }
    img.style.display = 'none';
  }
  // Reset borders
  const siblings = el.parentElement.children;
  for(let i=0; i<siblings.length; i++) siblings[i].style.borderColor = 'transparent';
  el.style.borderColor = 'var(--accent)';
};
