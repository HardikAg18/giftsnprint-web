// admin.js — GiftsNPrint Admin Panel
const API = '/api';
let adminToken = localStorage.getItem('gnp_admin_token');

/* ── Auth Check ── */
function requireAuth() {
  if (!adminToken && !location.pathname.endsWith('login.html')) {
    window.location.href = '/admin/login.html';
  }
}

/* ── Logout ── */
window.adminLogout = function() {
  localStorage.removeItem('gnp_admin_token');
  window.location.href = '/admin/login.html';
};

/* ── API Helper ── */
async function apiRequest(url, options = {}) {
  const res = await fetch(API + url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
      ...options.headers
    }
  });
  if (res.status === 401) { adminLogout(); return null; }
  return res.json();
}

/* ── Sidebar Toggle ── */
const sidebar = document.getElementById('sidebar');
const hamburger = document.getElementById('hamburgerAdmin');
hamburger?.addEventListener('click', () => sidebar?.classList.toggle('open'));
document.addEventListener('click', (e) => {
  if (sidebar?.classList.contains('open') && !sidebar.contains(e.target) && e.target !== hamburger) {
    sidebar.classList.remove('open');
  }
});

/* ── Active Nav ── */
const currentPage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-item[data-page]').forEach(item => {
  if (item.dataset.page === currentPage) item.classList.add('active');
});

/* ── Toast ── */
window.showAdminToast = function(msg, type = 'success') {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;top:20px;right:20px;background:var(--surface);border:1px solid var(--border);color:var(--text);padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:9999;box-shadow:var(--shadow);display:flex;align-items:center;gap:8px;transition:.3s;transform:translateX(100px);opacity:0`;
  t.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}" style="color:${type === 'success' ? '#10B981' : '#EF4444'}"></i> ${msg}`;
  document.body.appendChild(t);
  setTimeout(() => { t.style.transform = 'translateX(0)'; t.style.opacity = '1'; }, 10);
  setTimeout(() => { t.style.transform = 'translateX(100px)'; t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 3000);
};

/* ── Status Badge HTML ── */
window.statusBadge = function(status) {
  const map = {
    pending: 'pending', processing: 'processing', shipped: 'shipped',
    delivered: 'delivered', cancelled: 'cancelled', paid: 'paid',
    unpaid: 'unpaid', open: 'open', closed: 'closed', approved: 'approved'
  };
  const cls = map[status?.toLowerCase()] || 'pending';
  return `<span class="status status-${cls}">${status || 'unknown'}</span>`;
};

/* ── Format currency ── */
window.formatINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

/* ── Format date ── */
window.formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';

/* ── Modal helpers ── */
window.openModal = function(id) {
  document.getElementById(id)?.classList.add('open');
};
window.closeModal = function(id) {
  document.getElementById(id)?.classList.remove('open');
};
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

/* ── Load Dashboard Stats ── */
window.loadDashboardStats = async function() {
  const data = await apiRequest('/orders/stats');
  if (!data?.success) return;
  const s = data.stats;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('statOrders', s.totalOrders);
  set('statRevenue', formatINR(s.totalRevenue));
  set('statPending', s.pendingOrders);
  set('statCustomers', s.totalCustomers);
  set('pendingBadge', s.pendingOrders);

  // Recent orders table
  const tbody = document.getElementById('recentOrdersTbody');
  if (tbody && s.recentOrders?.length) {
    tbody.innerHTML = s.recentOrders.map(o => `
      <tr>
        <td><strong>${o.order_id}</strong></td>
        <td>${o.customer_name}</td>
        <td>${formatINR(o.total_amount)}</td>
        <td>${statusBadge(o.order_status)}</td>
        <td>${statusBadge(o.payment_status)}</td>
        <td>${formatDate(o.created_at)}</td>
        <td><a href="/admin/orders.html" class="btn btn-outline btn-sm">View</a></td>
      </tr>`).join('');
  }
};

/* ── Load Orders ── */
window.loadOrders = async function(params = {}) {
  const tbody = document.getElementById('ordersTbody');
  const loader = document.getElementById('ordersLoader');
  if (!tbody) return;
  loader?.classList.remove('hidden');
  const qs = new URLSearchParams(params).toString();
  const data = await apiRequest(`/orders?${qs}`);
  loader?.classList.add('hidden');
  if (!data?.success) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:40px">Error loading orders.</td></tr>'; return; }
  tbody.innerHTML = data.data.length ? data.data.map(o => `
    <tr>
      <td><strong>${o.order_id}</strong></td>
      <td><div>${o.customer_name}</div><div style="font-size:12px;color:var(--text-muted)">${o.customer_email}</div></td>
      <td>${o.customer_phone || '—'}</td>
      <td>${formatINR(o.total_amount)}</td>
      <td>${statusBadge(o.order_status)}</td>
      <td>${statusBadge(o.payment_status)}</td>
      <td>${formatDate(o.created_at)}</td>
      <td>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="btn btn-outline btn-sm btn-icon" title="Update Status" onclick="openUpdateOrder('${o.id}','${o.order_id}','${o.order_status}')"><i class="fas fa-edit"></i></button>
          ${o.tracking_id 
            ? `<a href="https://www.delhivery.com/track/package/${o.tracking_id}" target="_blank" class="btn btn-outline btn-sm btn-icon" title="Track package" style="color:#10B981;border-color:rgba(16,185,129,0.3);background:rgba(16,185,129,0.05)"><i class="fas fa-eye"></i></a>` 
            : `<button class="btn btn-outline btn-sm btn-icon" title="Ship with Delhivery" style="color:#10B981;border-color:rgba(16,185,129,0.3);background:rgba(16,185,129,0.05)" onclick="openShipOrder('${o.id}','${o.order_id}')"><i class="fas fa-truck"></i></button>`
          }
          <button class="btn btn-outline btn-sm btn-icon" title="Delete Order" style="color:#EF4444;border-color:rgba(239,68,68,0.3);background:rgba(239,68,68,0.05)" onclick="deleteOrder('${o.id}','${o.order_id}')"><i class="fas fa-trash-alt"></i></button>
        </div>
        ${o.tracking_id ? `<div style="font-size:11px;margin-top:4px;color:var(--text-muted)">AWB: <b>${o.tracking_id}</b></div>` : ''}
      </td>
    </tr>`).join('')
    : '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:40px">No orders found.</td></tr>';
};

window.openUpdateOrder = function(id, orderId, currentStatus) {
  document.getElementById('updateOrderId').value = id;
  document.getElementById('updateOrderIdLabel').textContent = orderId;
  document.getElementById('updateOrderStatus').value = currentStatus;
  openModal('updateOrderModal');
};

document.getElementById('updateOrderForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('updateOrderId').value;
  const status = document.getElementById('updateOrderStatus').value;
  const tracking = document.getElementById('updateTracking').value;
  const notes = document.getElementById('updateNotes').value;
  const data = await apiRequest(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ order_status: status, tracking_info: tracking, notes }) });
  if (data?.success) { showAdminToast('Order status updated!'); closeModal('updateOrderModal'); loadOrders(); window.updateSidebarBadge(); }
  else showAdminToast('Failed to update order.', 'error');
});

window.openShipOrder = function(id, orderId) {
  document.getElementById('shipOrderId').value = id;
  document.getElementById('shipOrderIdLabel').textContent = orderId;
  
  // Default pickup date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('shipPickupDate').value = tomorrow.toISOString().split('T')[0];
  
  openModal('shipOrderModal');
};

document.getElementById('shipOrderForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('shipOrderId').value;
  const pickup_date = document.getElementById('shipPickupDate').value;
  const pickup_time = document.getElementById('shipPickupTime').value;
  const btn = document.getElementById('shipSubmitBtn');
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Manifesting...';
  
  const data = await apiRequest(`/orders/${id}/ship`, { 
    method: 'POST', 
    body: JSON.stringify({ pickup_date, pickup_time }) 
  });
  
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-truck"></i> Generate Manifest';
  
  if (data?.success) { 
    showAdminToast('Order manifested and scheduled for pickup!'); 
    closeModal('shipOrderModal'); 
    loadOrders(); 
    window.updateSidebarBadge();
  } else { 
    showAdminToast(data?.message || 'Failed to manifest order.', 'error'); 
  }
});

window.deleteOrder = async function(id, orderId) {
  if (confirm(`Are you sure you want to delete order ${orderId}? This action cannot be undone.`)) {
    const data = await apiRequest(`/orders/${id}`, { method: 'DELETE' });
    if (data?.success) {
      showAdminToast('Order deleted successfully!');
      loadOrders();
      window.updateSidebarBadge();
    } else {
      showAdminToast(data?.message || 'Failed to delete order.', 'error');
    }
  }
};

/* ── Load Products (Admin) ── */
window.loadAdminProducts = async function(params = {}) {
  const tbody = document.getElementById('adminProductsTbody');
  if (!tbody) return;
  params.admin = 'true';
  const qs = new URLSearchParams(params).toString();
  const data = await apiRequest(`/products?${qs}`);
  if (!data?.success) return;
  tbody.innerHTML = data.data.length ? data.data.map(p => `
    <tr>
      <td><img src="${p.image_url || '/images/hero_banner.png'}" style="width:44px;height:44px;border-radius:8px;object-fit:cover"></td>
      <td><strong>${p.name}</strong><div style="font-size:12px;color:var(--text-muted)">${p.slug}</div></td>
      <td>${p.category_name}</td>
      <td>${formatINR(p.base_price)}</td>
      <td>${p.total_orders || 0}</td>
      <td><span class="status ${p.is_active ? 'status-approved' : 'status-cancelled'}">${p.is_active ? 'Active' : 'Inactive'}</span></td>
      <td>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="btn btn-outline btn-sm btn-icon" title="Edit Product" onclick="editProduct(${JSON.stringify(p).replace(/"/g,'&quot;')})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-outline btn-sm btn-icon" title="Delete Product" style="color:#EF4444;border-color:rgba(239,68,68,0.3);background:rgba(239,68,68,0.05)" onclick="deleteProduct(${p.id}, '${p.name.replace(/'/g, "\\'")}')"><i class="fas fa-trash-alt"></i></button>
        </div>
      </td>
    </tr>`).join('')
    : '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:40px">No products found.</td></tr>';
};

window.deleteProduct = async function(id, name) {
  if (!confirm(`Are you sure you want to permanently delete "${name}"? This action cannot be undone.`)) return;
  const data = await apiRequest(`/products/${id}`, { method: 'DELETE' });
  if (data?.success) { showAdminToast('Product deleted permanently.'); loadAdminProducts(); }
  else showAdminToast('Failed to delete product.', 'error');
};

/* ── Load Enquiries ── */
window.loadEnquiries = async function() {
  const tbody = document.getElementById('enquiriesTbody');
  if (!tbody) return;
  const data = await apiRequest('/contact');
  if (!data?.success) return;
  tbody.innerHTML = data.data?.length ? data.data.map(e => `
    <tr>
      <td><strong>${e.name}</strong></td>
      <td><a href="mailto:${e.email}" style="color:var(--primary-light)">${e.email}</a></td>
      <td>${e.phone || '—'}</td>
      <td>${e.subject || '—'}</td>
      <td>${statusBadge(e.status || 'open')}</td>
      <td>${formatDate(e.created_at)}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="updateEnquiryStatus(${e.id}, '${e.status === 'resolved' ? 'open' : 'resolved'}')">Mark ${e.status === 'resolved' ? 'Open' : 'Resolved'}</button>
      </td>
    </tr>`).join('')
    : '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:40px">No enquiries found.</td></tr>';
};

window.updateEnquiryStatus = async function(id, status) {
    const data = await apiRequest(`/contact/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
    if (data?.success) { showAdminToast('Status updated'); loadEnquiries(); }
};

/* ── Load Customers ── */
window.loadCustomers = async function() {
  const tbody = document.getElementById('customersTbody');
  if (!tbody) return;
  const data = await apiRequest('/customers');
  if (!data?.success) return;
  tbody.innerHTML = data.data?.length ? data.data.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td>${c.email}</td>
      <td>${c.phone}</td>
      <td>${c.total_orders}</td>
      <td>${formatINR(c.total_spent)}</td>
      <td>${formatDate(c.last_active)}</td>
      <td><span class="status ${c.is_subscriber ? 'status-approved' : ''}">${c.is_subscriber ? 'Subscribed' : 'No'}</span></td>
    </tr>`).join('')
    : '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:40px">No customers found.</td></tr>';
};

/* ── Load Reviews ── */
window.loadReviews = async function() {
  const tbody = document.getElementById('reviewsTbody');
  if (!tbody) return;
  const data = await apiRequest('/reviews/admin');
  if (!data?.success) return;
  tbody.innerHTML = data.data?.length ? data.data.map(r => `
    <tr>
      <td><div><strong>${r.customer_name}</strong></div><div style="font-size:12px;color:var(--text-muted)">${r.customer_email}</div></td>
      <td>${r.product_name || 'General'}</td>
      <td><div style="color:var(--accent)"><i class="fas fa-star"></i> ${r.rating}</div></td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.review_text}">${r.review_text}</td>
      <td><span class="status ${r.is_approved ? 'status-approved' : 'status-pending'}">${r.is_approved ? 'Approved' : 'Pending'}</span></td>
      <td>
        <button class="btn btn-outline btn-sm btn-icon" title="Toggle Approval" onclick="updateReviewStatus(${r.id}, ${!r.is_approved}, ${r.is_featured})"><i class="fas fa-${r.is_approved ? 'times' : 'check'}"></i></button>
      </td>
    </tr>`).join('')
    : '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:40px">No reviews found.</td></tr>';
};

window.updateReviewStatus = async function(id, is_approved, is_featured) {
    const data = await apiRequest(`/reviews/${id}`, { method: 'PUT', body: JSON.stringify({ is_approved, is_featured }) });
    if (data?.success) { showAdminToast('Review updated'); loadReviews(); }
};

window.updateSidebarBadge = async function() {
  if (location.pathname.includes('index.html')) return; // loadDashboardStats already updates it on dashboard
  const badge = document.getElementById('pendingBadge');
  if (!badge) return;
  try {
    const data = await apiRequest('/orders/stats');
    if (data?.success) {
      badge.textContent = data.stats.pendingOrders;
    }
  } catch (e) {
    console.error('Failed to update sidebar badge:', e);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  if (location.pathname.includes('index.html')) loadDashboardStats();
  if (location.pathname.includes('orders.html')) loadOrders();
  if (location.pathname.includes('customers.html')) loadCustomers();
  if (location.pathname.includes('enquiries.html')) loadEnquiries();
  if (location.pathname.includes('reviews.html')) loadReviews();
  
  window.updateSidebarBadge();
});

// Init on load
requireAuth();
