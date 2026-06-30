// products.js — GiftsNPrint product listing & detail
const API_BASE = '/api';

/* ── Helper: Render Product Card ── */
function renderProductCard(p) {
  const inclusivePrice = Number(p.base_price) * (1 + (parseFloat(p.gst_percent) || 18) / 100);
  return `
    <div class="card animate-fadeUp" onclick="window.location.href='/product-detail.html?slug=${p.slug}'">
      <div class="card-img-wrap">
        <img src="${p.image_url || '/images/hero_banner.png'}" alt="${p.name}" class="card-img" loading="lazy" onerror="this.src='/images/hero_banner.png'">
        ${p.is_featured ? '<span class="card-badge">Featured</span>' : ''}
      </div>
      <div class="card-body">
        <div class="card-category">${p.category_name}</div>
        <h3 class="card-title">${p.name}</h3>
        <p class="card-desc">${p.short_description || ''}</p>
        <div style="display:flex;flex-direction:column;gap:4px;margin-top:12px">
          <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
            <div class="card-price">₹${inclusivePrice.toLocaleString('en-IN', {maximumFractionDigits:2})}<span class="card-price-unit">/${p.unit_type || 'pcs'}</span></div>
            <div class="rating"><i class="fas fa-star"></i> ${p.rating || '4.8'}</div>
          </div>
          <div style="font-size:10px;color:var(--accent);font-weight:600;margin-bottom:2px">Inclusive of all taxes</div>
          <div style="font-size:12px;color:var(--text);font-weight:600;margin-top:2px">₹${Number(p.base_price).toLocaleString('en-IN', {maximumFractionDigits:2})}<span style="font-size:10px;color:var(--text-muted)">/${p.unit_type || 'pcs'} (without GST)</span></div>
          <div style="font-size:10px;color:var(--text-muted);font-weight:600;">Exclusive of all taxes</div>
        </div>
      </div>
      <div class="card-footer">
        <span style="font-size:12px;color:var(--text-muted)">Min. ${p.min_order_qty || 25} units</span>
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();window.location.href='/product-detail.html?slug=${p.slug}'">View Details</button>
      </div>
    </div>
  `;
}

/* ── Product Listing Page ── */
async function loadProducts(params = {}) {
  const grid = document.getElementById('productsGrid');
  const loader = document.getElementById('productsLoader');
  if (!grid) return;

  loader?.classList.remove('hidden');
  grid.innerHTML = '';

  const isGroupedView = !params.category && !params.search && (!params.sort || params.sort === 'default');
  if (isGroupedView) {
    params.limit = 100;
  }

  const qs = new URLSearchParams(params).toString();
  try {
    const res = await fetch(`${API_BASE}/products?${qs}`);
    const data = await res.json();
    loader?.classList.add('hidden');

    if (!data.success || !data.data.length) {
      grid.innerHTML = `<div class="no-products"><i class="fas fa-box-open"></i><p>No products found. Try a different filter.</p></div>`;
      return;
    }

    if (isGroupedView) {
      const grouped = {};
      data.data.forEach(p => {
        if (!grouped[p.category_name]) {
          grouped[p.category_name] = [];
        }
        grouped[p.category_name].push(p);
      });

      const categoryOrder = {
        'Custom Printing': 1,
        'Corporate Gifts': 2,
        'Awards & Trophies': 3,
        'Promotional Items': 4,
        'Advanced Printing': 5,
        'Express Collection': 6
      };

      const sortedCategories = Object.keys(grouped).sort((a, b) => {
        return (categoryOrder[a] || 99) - (categoryOrder[b] || 99);
      });

      grid.innerHTML = sortedCategories.map(catName => `
        <div class="category-group-section" style="margin-bottom: 48px; width: 100%">
          <h2 class="category-group-title" style="font-family:'Outfit', sans-serif; font-size:24px; font-weight:800; border-left:4px solid var(--accent); padding-left:12px; margin-bottom:20px; color:var(--text)">${catName}</h2>
          <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:24px; width: 100%">
            ${grouped[catName].map(p => renderProductCard(p)).join('')}
          </div>
        </div>
      `).join('');
      grid.style.display = 'block';
    } else {
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(auto-fill,minmax(260px,1fr))';
      grid.style.gap = '24px';
      grid.innerHTML = data.data.map(p => renderProductCard(p)).join('');
    }

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
async function initFilters() {
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

  if (categoryFilter && categoryFilter.tagName === 'SELECT') {
    try {
      const res = await fetch(`${API_BASE}/products/categories`);
      const data = await res.json();
      if (data.success && data.data) {
        let html = `<option value="">All Categories</option>`;
        data.data.forEach(c => {
          html += `<option value="${c.slug}">${c.name}</option>`;
        });
        categoryFilter.innerHTML = html;
      }
    } catch (e) {
      console.error('Failed to load dynamic categories:', e);
    }
  }

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
    const initialInclusivePrice = Number(p.base_price) * (1 + (parseFloat(p.gst_percent) || 18) / 100);
    document.getElementById('productPrice').textContent = `₹${initialInclusivePrice.toLocaleString('en-IN', {maximumFractionDigits:2})} / ${p.unit_type || 'pcs'}`;
    // Render dynamic stars in container
    const ratingContainer = document.querySelector('.product-layout .rating');
    if (ratingContainer) {
      const ratingVal = parseFloat(p.rating) || 4.8;
      let starsHtml = '';
      for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(ratingVal)) {
          starsHtml += '<i class="fas fa-star"></i>';
        } else if (i - 0.5 <= ratingVal) {
          starsHtml += '<i class="fas fa-star-half-alt"></i>';
        } else {
          starsHtml += '<i class="far fa-star"></i>';
        }
      }
      ratingContainer.innerHTML = `${starsHtml} <span id="productRating">${ratingVal.toFixed(2)}</span>`;
    } else {
      const pr = document.getElementById('productRating');
      if (pr) pr.textContent = p.rating || '4.8';
    }
    document.getElementById('productOrders').textContent = p.total_orders || '100';
    document.getElementById('minQtyHint').textContent = `Minimum order: ${p.min_order_qty || 1} ${p.unit_type || 'pcs'}`;

    if (p.offer) {
      const oC = document.getElementById('availableOfferContainer');
      if(oC) {
        oC.style.display = 'block';
        document.getElementById('offerCode').textContent = p.offer.code;
        document.getElementById('offerDesc').textContent = p.offer.description || 'Apply code at checkout';
        document.getElementById('offerDiscountBadge').textContent = p.offer.discount_type === 'percentage' ? p.offer.discount_value + '% OFF' : '₹' + p.offer.discount_value + ' OFF';
      }
    } else {
      const oC = document.getElementById('availableOfferContainer');
      if(oC) oC.style.display = 'none';
    }

    if (p.category_slug === 'express-collection') {
      const dAction = document.getElementById('designActionsContainer');
      const cNote = document.getElementById('customizationNoteContainer');
      if (dAction) dAction.style.display = 'none';
      if (cNote) cNote.style.display = 'none';
    }

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
    const pricingSection = document.getElementById('pricingTableSection');
    if (p.pricing_tiers?.length) {
      if (pricingSection) pricingSection.style.display = 'block';
      const tbody = document.getElementById('pricingTbody');
      if (tbody) {
        tbody.innerHTML = p.pricing_tiers.map(t => `
          <tr>
            <td>${t.min_qty}${t.max_qty ? '–' + t.max_qty : '+'}</td>
            <td class="price-highlight">₹${Number(t.price_per_unit).toFixed(2)}</td>
            <td>Save ${Math.round((1 - t.price_per_unit / p.base_price) * 100)}%</td>
          </tr>`).join('');
      }
    } else {
      if (pricingSection) pricingSection.style.display = 'none';
    }

    // Related products
    if (p.related_products?.length) {
      const rel = document.getElementById('relatedGrid');
      if (rel) rel.innerHTML = p.related_products.map(r => {
        const inclusivePrice = Number(r.base_price) * (1 + (parseFloat(r.gst_percent) || 18) / 100);
        return `
        <div class="card" onclick="window.location.href='/product-detail.html?slug=${r.slug}'">
          <img src="${r.image_url || '/images/hero_banner.png'}" class="card-img" loading="lazy">
          <div class="card-body">
            <h4 class="card-title">${r.name}</h4>
            <div style="display:flex;flex-direction:column;gap:4px">
              <div class="card-price" style="font-size:14px">₹${inclusivePrice.toLocaleString('en-IN', {maximumFractionDigits:2})}<span style="font-size:11px;color:var(--text-muted)">/unit</span></div>
              <div style="font-size:9px;color:var(--accent);font-weight:600;margin-bottom:2px">Inclusive of all taxes</div>
              <div style="font-size:12px;color:var(--text);font-weight:600;">₹${Number(r.base_price).toLocaleString('en-IN', {maximumFractionDigits:2})}<span style="font-size:9px;color:var(--text-muted)">/unit (without GST)</span></div>
              <div style="font-size:9px;color:var(--text-muted);font-weight:600;">Exclusive of all taxes</div>
            </div>
          </div>
        </div>`;
      }).join('');
    }

    // Setup Stock Status Warning and limits
    const qtyInput = document.getElementById('qtyInput');
    const minQ = p.min_order_qty || 1;
    let isOutOfStock = false;

    if (qtyInput) {
      const qtyContainer = qtyInput.closest('div');
      if (qtyContainer) {
        let stockEl = document.getElementById('stockStatusDisplay');
        if (!stockEl) {
          stockEl = document.createElement('div');
          stockEl.id = 'stockStatusDisplay';
          stockEl.style.cssText = 'margin-bottom:12px;font-size:14px;font-weight:700;display:flex;align-items:center;gap:6px';
          qtyContainer.parentElement.insertBefore(stockEl, qtyContainer);
        }

        if (p.stock !== null && p.stock !== undefined) {
          const stockVal = parseInt(p.stock);
          if (stockVal <= 0) {
            isOutOfStock = true;
            stockEl.innerHTML = `<span style="color:#ef4444"><i class="fas fa-times-circle"></i> Out of Stock</span>`;
            qtyInput.disabled = true;
          } else if (stockVal < 10) {
            stockEl.innerHTML = `<span style="color:#f59e0b"><i class="fas fa-exclamation-triangle"></i> Only ${stockVal} left in stock - order soon!</span>`;
            qtyInput.max = stockVal;
          } else {
            stockEl.innerHTML = `<span style="color:#10b981"><i class="fas fa-check-circle"></i> In Stock (${stockVal} available)</span>`;
            qtyInput.max = stockVal;
          }
        } else {
          stockEl.innerHTML = `<span style="color:#10b981"><i class="fas fa-check-circle"></i> In Stock</span>`;
        }
      }

      qtyInput.value = minQ;
      qtyInput.min = minQ;

      document.getElementById('qtyMinus')?.addEventListener('click', () => {
        let q = parseInt(qtyInput.value) || minQ;
        if (q > minQ) { qtyInput.value = q - 1; calculateTotal(); }
      });
      document.getElementById('qtyPlus')?.addEventListener('click', () => {
        let q = parseInt(qtyInput.value) || minQ;
        if (p.stock !== null && p.stock !== undefined && q >= parseInt(p.stock)) {
          showToast(`Only ${p.stock} units available in stock!`, 'error');
          return;
        }
        qtyInput.value = q + 1; calculateTotal();
      });
      qtyInput.addEventListener('change', () => {
        let q = parseInt(qtyInput.value);
        if(isNaN(q) || q < minQ) qtyInput.value = minQ;
        if(p.stock !== null && p.stock !== undefined && q > parseInt(p.stock)) {
          showToast(`Only ${p.stock} units available in stock!`, 'error');
          qtyInput.value = p.stock;
        }
        calculateTotal();
      });
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

    // Disclaimers & Action States
    const atcBtn = document.getElementById('addToCartBtn');
    const buyNowBtn = document.getElementById('buyNowBtn');
    if (isOutOfStock) {
      if (atcBtn) { atcBtn.disabled = true; atcBtn.style.opacity = '0.5'; atcBtn.style.pointerEvents = 'none'; atcBtn.textContent = 'Out of Stock'; }
      if (buyNowBtn) { buyNowBtn.disabled = true; buyNowBtn.style.opacity = '0.5'; buyNowBtn.style.pointerEvents = 'none'; buyNowBtn.textContent = 'Out of Stock'; }
    }

    // Return Policy Disclaimer
    if (p.no_return === true || p.no_return === 1 || p.no_return === 'true') {
      const parentActions = document.querySelector('.product-actions')?.parentElement;
      if (parentActions) {
        let returnNotice = document.getElementById('returnNoticeDisplay');
        if (!returnNotice) {
          returnNotice = document.createElement('div');
          returnNotice.id = 'returnNoticeDisplay';
          returnNotice.style.cssText = 'margin-bottom:20px;padding:12px 16px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:8px;font-size:13.5px;color:#dc2626;font-weight:600;display:flex;align-items:center;gap:8px';
          returnNotice.innerHTML = `<i class="fas fa-exclamation-circle"></i> This item is non-returnable (Custom/Printed product)`;
          const actionsContainer = document.querySelector('.product-actions');
          parentActions.insertBefore(returnNotice, actionsContainer);
        }
      }
    }

    // Add to cart
    atcBtn?.addEventListener('click', () => {
      const qty = parseInt(qtyInput.value);
      const customization = document.getElementById('customizationNote')?.value || '';
      addToCart({ id: p.id, name: p.name, price: window.currentCalculatedPrice || p.base_price, qty, image: p.image_url, slug: p.slug, customization, gst_percent: p.gst_percent, no_return: p.no_return });
    });

    // Buy Now
    buyNowBtn?.addEventListener('click', () => {
      const qty = parseInt(qtyInput.value);
      const customization = document.getElementById('customizationNote')?.value || '';
      addToCart({ id: p.id, name: p.name, price: window.currentCalculatedPrice || p.base_price, qty, image: p.image_url, slug: p.slug, customization, gst_percent: p.gst_percent, no_return: p.no_return }, true);
      window.location.href = '/checkout.html';
    });

    // Quote
    const quoteBtn = document.getElementById('quoteBtn');
    quoteBtn?.addEventListener('click', () => {
      const qty = qtyInput.value;
      window.location.href = `/quote.html?product=${encodeURIComponent(p.name)}&qty=${qty}`;
    });

    // Calculate Total Price
    const customSizeContainer = document.getElementById('customSizeContainer');
    const customW = document.getElementById('customWidth');
    const customH = document.getElementById('customHeight');

    function calculateTotal() {
      const qty = parseInt(qtyInput?.value) || minQ;
      
      let baseUnitPrice = parseFloat(p.base_price);
      if (p.pricing_tiers && p.pricing_tiers.length > 0) {
        let applicableTier = null;
        for(let i=0; i<p.pricing_tiers.length; i++) {
          if (qty >= p.pricing_tiers[i].min_qty) applicableTier = p.pricing_tiers[i];
        }
        if (applicableTier) baseUnitPrice = parseFloat(applicableTier.price_per_unit);
      }
      
      const taxMultiplier = 1 + (parseFloat(p.gst_percent) || 18) / 100;
      
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
        areaMultiplier = (w * h) / 100;
        if (areaMultiplier < 1) areaMultiplier = 1;
      }

      const finalUnitPrice = (baseUnitPrice + modifiers) * areaMultiplier;
      window.currentCalculatedPrice = finalUnitPrice;
      
      const finalInclusiveUnitPrice = finalUnitPrice * taxMultiplier;

      const detailNeedGSTBill = document.getElementById('detailNeedGSTBill');
      const needGst = detailNeedGSTBill ? detailNeedGSTBill.checked : true;
      if (detailNeedGSTBill) {
        localStorage.setItem('need_gst_bill', needGst ? 'true' : 'false');
      }

      const displayUnitPrice = needGst ? finalInclusiveUnitPrice : finalUnitPrice;

      document.getElementById('productPrice').textContent = `₹${displayUnitPrice.toLocaleString('en-IN', {maximumFractionDigits:2})}`;

      const unitDisplay = document.getElementById('unitPriceDisplay');
      if (unitDisplay) {
        unitDisplay.textContent = `(₹${displayUnitPrice.toFixed(2)} / ${p.unit_type || 'unit'})`;
      }

      const incTaxesLine = document.getElementById('inclusiveTaxesLine');
      const withoutGstContainer = document.getElementById('productPriceWithoutGstContainer');
      const withoutGstEl = document.getElementById('productPriceWithoutGst');
      const exclTaxesLine = document.getElementById('exclusiveTaxesLine');

      if (needGst) {
        if (incTaxesLine) {
          incTaxesLine.style.display = 'block';
          incTaxesLine.textContent = 'Inclusive of all taxes';
        }
        if (withoutGstContainer) withoutGstContainer.style.display = 'flex';
        if (withoutGstEl) withoutGstEl.textContent = `₹${finalUnitPrice.toLocaleString('en-IN', {maximumFractionDigits:2})}`;
        if (exclTaxesLine) exclTaxesLine.style.display = 'block';
      } else {
        if (incTaxesLine) {
          incTaxesLine.style.display = 'block';
          incTaxesLine.textContent = 'Exclusive of all taxes';
        }
        if (withoutGstContainer) withoutGstContainer.style.display = 'none';
        if (exclTaxesLine) exclTaxesLine.style.display = 'none';
      }
      
      const mrpEl = document.getElementById('productMrp');
      const savEl = document.getElementById('productSavings');
      const badgeEl = document.getElementById('productSavingsBadge');
      
      const mrpVal = parseFloat(p.mrp);
      if (mrpVal && mrpVal > p.base_price) {
        const mrpAdjusted = (mrpVal + modifiers) * areaMultiplier;
        const mrpAdjustedInclusive = mrpAdjusted * taxMultiplier;
        
        const displayMrp = needGst ? mrpAdjustedInclusive : mrpAdjusted;
        const discountAmt = displayMrp - displayUnitPrice;
        const discountPct = Math.round((discountAmt / displayMrp) * 100);
        
        if (mrpEl) {
          mrpEl.style.display = 'block';
          mrpEl.textContent = `M.R.P: ₹${displayMrp.toLocaleString('en-IN', {maximumFractionDigits:2})}`;
        }
        if (savEl) {
          savEl.style.display = 'block';
          savEl.textContent = `(${discountPct}% off)`;
        }
        if (badgeEl) {
          badgeEl.style.display = 'block';
          badgeEl.innerHTML = `<span style="font-size:14px">${discountPct}% savings</span> <span style="font-weight:400">included for business</span>`;
        }
      } else {
        if (mrpEl) mrpEl.style.display = 'none';
        if (savEl) savEl.style.display = 'none';
        if (badgeEl) badgeEl.style.display = 'none';
      }
      
      const totalDisplayPrice = displayUnitPrice * qty;
      document.getElementById('totalPriceDisplay').textContent = `Total: ₹${totalDisplayPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    }
    
    qtyInput?.addEventListener('input', calculateTotal);
    customW?.addEventListener('input', calculateTotal);
    customH?.addEventListener('input', calculateTotal);
    document.querySelectorAll('.dyn-option-select').forEach(el => el.addEventListener('change', calculateTotal));
    
    const detailNeedGSTBill = document.getElementById('detailNeedGSTBill');
    if (detailNeedGSTBill) {
      const storedGSTPref = localStorage.getItem('need_gst_bill');
      if (storedGSTPref !== null) {
        detailNeedGSTBill.checked = storedGSTPref === 'true';
      }
      detailNeedGSTBill.addEventListener('change', calculateTotal);
    }

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
