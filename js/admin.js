// Logic untuk dashboard admin

// ===== LOGIN =====
function handleLogin(e) {
  e.preventDefault();
  const password = document.getElementById('password').value;
  
  if (password === CONFIG.ADMIN_PASSWORD) {
    sessionStorage.setItem('adminLoggedIn', 'true');
    window.location.href = 'produk.html';
  } else {
    alert('Password salah!');
  }
}

// ===== PRODUK MANAGEMENT =====
let allProduk = [];
let editingProdukId = null;

async function loadProdukAdmin() {
  try {
    showLoading();
    const { data, error } = await supabase
      .from('produk')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allProduk = data;
    renderProdukTable();
  } catch (error) {
    console.error('Error loading produk:', error);
    alert('Gagal memuat produk: ' + error.message);
  } finally {
    hideLoading();
  }
}

function renderProdukTable() {
  const tbody = document.getElementById('produkTableBody');
  
  if (allProduk.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2rem;">
          Belum ada produk. Klik tombol "Tambah Produk" untuk menambah.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = allProduk.map(produk => `
    <tr>
      <td>
        <img src="${produk.foto_url || 'https://picsum.photos/seed/' + produk.id + '/100/100'}" 
             alt="${produk.nama}" 
             style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">
      </td>
      <td>${produk.nama}</td>
      <td>${produk.kategori}</td>
      <td>${formatRupiah(produk.harga)}</td>
      <td>${produk.stok}</td>
      <td>
        <span class="badge ${produk.aktif ? 'badge-aktif' : 'badge-nonaktif'}">
          ${produk.aktif ? 'Aktif' : 'Nonaktif'}
        </span>
      </td>
      <td>
        <button class="btn-icon" onclick="editProduk('${produk.id}')" title="Edit">
          ✏️
        </button>
        <button class="btn-icon" onclick="toggleAktifProduk('${produk.id}', ${!produk.aktif})" title="${produk.aktif ? 'Nonaktifkan' : 'Aktifkan'}">
          ${produk.aktif ? '👁️' : '🚫'}
        </button>
        <button class="btn-icon btn-danger" onclick="deleteProduk('${produk.id}')" title="Hapus">
          🗑️
        </button>
      </td>
    </tr>
  `).join('');
}

function openProdukModal() {
  editingProdukId = null;
  document.getElementById('produkModalTitle').textContent = 'Tambah Produk';
  document.getElementById('produkForm').reset();
  document.getElementById('fotoPreview').innerHTML = '';
  document.getElementById('produkModal').style.display = 'flex';
}

function closeProdukModal() {
  document.getElementById('produkModal').style.display = 'none';
}

async function editProduk(id) {
  const produk = allProduk.find(p => p.id === id);
  if (!produk) return;

  editingProdukId = id;
  document.getElementById('produkModalTitle').textContent = 'Edit Produk';
  document.getElementById('namaProduk').value = produk.nama;
  document.getElementById('deskripsiProduk').value = produk.deskripsi || '';
  document.getElementById('hargaProduk').value = produk.harga;
  document.getElementById('stokProduk').value = produk.stok;
  document.getElementById('kategoriProduk').value = produk.kategori;

  if (produk.foto_url) {
    document.getElementById('fotoPreview').innerHTML = 
      `<img src="${produk.foto_url}" alt="${produk.nama}">`;
  }

  document.getElementById('produkModal').style.display = 'flex';
}

async function saveProduk(e) {
  e.preventDefault();

  try {
    showLoading();

    const formData = new FormData(e.target);
    const produkData = {
      nama: formData.get('nama'),
      deskripsi: formData.get('deskripsi'),
      harga: parseInt(formData.get('harga')),
      stok: parseInt(formData.get('stok')),
      kategori: formData.get('kategori')
    };

    // Upload foto jika ada
    const fotoFile = document.getElementById('fotoProduk').files[0];
    if (fotoFile) {
      // Hapus foto lama jika edit
      if (editingProdukId) {
        const oldProduk = allProduk.find(p => p.id === editingProdukId);
        if (oldProduk && oldProduk.foto_url) {
          const oldPath = oldProduk.foto_url.split('/').pop();
          await supabase.storage.from('produk-foto').remove([oldPath]);
        }
      }

      const fileExt = fotoFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('produk-foto')
        .upload(fileName, fotoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('produk-foto')
        .getPublicUrl(fileName);

      produkData.foto_url = publicUrl;
    }

    // Insert atau update
    if (editingProdukId) {
      produkData.updated_at = new Date().toISOString();
      const { error } = await supabase
        .from('produk')
        .update(produkData)
        .eq('id', editingProdukId);

      if (error) throw error;
    } else {
      produkData.aktif = true;
      produkData.created_at = new Date().toISOString();
      const { error } = await supabase
        .from('produk')
        .insert([produkData]);

      if (error) throw error;
    }

    closeProdukModal();
    loadProdukAdmin();
    alert('Produk berhasil disimpan!');
  } catch (error) {
    console.error('Error saving produk:', error);
    alert('Gagal menyimpan produk: ' + error.message);
  } finally {
    hideLoading();
  }
}

async function toggleAktifProduk(id, aktif) {
  try {
    showLoading();
    const { error } = await supabase
      .from('produk')
      .update({ aktif: aktif })
      .eq('id', id);

    if (error) throw error;

    loadProdukAdmin();
  } catch (error) {
    console.error('Error toggle aktif produk:', error);
    alert('Gagal mengubah status produk: ' + error.message);
  } finally {
    hideLoading();
  }
}

async function deleteProduk(id) {
  if (!confirm('Yakin ingin menghapus produk ini?')) return;

  try {
    showLoading();

    // Hapus foto dari storage
    const produk = allProduk.find(p => p.id === id);
    if (produk && produk.foto_url) {
      const fileName = produk.foto_url.split('/').pop();
      await supabase.storage.from('produk-foto').remove([fileName]);
    }

    // Hapus dari database
    const { error } = await supabase
      .from('produk')
      .delete()
      .eq('id', id);

    if (error) throw error;

    loadProdukAdmin();
    alert('Produk berhasil dihapus!');
  } catch (error) {
    console.error('Error deleting produk:', error);
    alert('Gagal menghapus produk: ' + error.message);
  } finally {
    hideLoading();
  }
}

// Preview foto sebelum upload
document.getElementById('fotoProduk')?.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('fotoPreview').innerHTML = 
        `<img src="${e.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
  }
});

// ===== ORDER MANAGEMENT =====
let allOrders = [];

async function loadOrders() {
  try {
    showLoading();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allOrders = data;
    renderOrdersTable();
  } catch (error) {
    console.error('Error loading orders:', error);
    alert('Gagal memuat orders: ' + error.message);
  } finally {
    hideLoading();
  }
}

function renderOrdersTable() {
  const tbody = document.getElementById('ordersTableBody');
  
  if (allOrders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2rem;">
          Belum ada order masuk.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = allOrders.map(order => `
    <tr>
      <td><code>${order.id.substring(0, 8)}</code></td>
      <td>${formatDate(order.created_at)}</td>
      <td>
        <strong>${order.customer_nama}</strong><br>
        <small>${order.customer_phone}</small>
      </td>
      <td>${order.customer_kota}</td>
      <td>${formatRupiah(order.total)}</td>
      <td>
        <span class="badge badge-${getStatusClass(order.status)}">
          ${getStatusText(order.status)}
        </span>
      </td>
      <td>
        <button class="btn-icon" onclick="viewOrderDetail('${order.id}')" title="Lihat Detail">
          👁️
        </button>
        <button class="btn-icon" onclick="updateOrderStatus('${order.id}')" title="Update Status">
          ✏️
        </button>
        <button class="btn-icon" onclick="contactCustomer('${order.customer_phone}', '${order.id}')" title="Hubungi Customer">
          💬
        </button>
      </td>
    </tr>
  `).join('');
}

function getStatusClass(status) {
  const classes = {
    'pending': 'warning',
    'dibayar': 'info',
    'diproses': 'info',
    'dikirim': 'success',
    'selesai': 'success',
    'dibatalkan': 'danger'
  };
  return classes[status] || 'secondary';
}

function getStatusText(status) {
  const texts = {
    'pending': 'Pending',
    'dibayar': 'Dibayar',
    'diproses': 'Diproses',
    'dikirim': 'Dikirim',
    'selesai': 'Selesai',
    'dibatalkan': 'Dibatalkan'
  };
  return texts[status] || status;
}

function viewOrderDetail(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;

  const items = order.items.map(item => 
    `<div class="order-item">
      <span>${item.nama} x${item.qty}</span>
      <span>${formatRupiah(item.harga * item.qty)}</span>
    </div>`
  ).join('');

  const detail = `
    <div class="order-detail">
      <h3>Order #${order.id.substring(0, 8)}</h3>
      <div class="detail-section">
        <h4>Customer</h4>
        <p><strong>${order.customer_nama}</strong></p>
        <p>${order.customer_phone}</p>
        <p>${order.customer_alamat}</p>
        <p>${order.customer_kota}</p>
      </div>
      <div class="detail-section">
        <h4>Items</h4>
        ${items}
      </div>
      <div class="detail-section">
        <h4>Pengiriman</h4>
        <p>${order.kurir}</p>
        <p>Ongkir: ${formatRupiah(order.ongkir)}</p>
      </div>
      <div class="detail-section">
        <h4>Pembayaran</h4>
        <p>${order.payment_method}</p>
        <p>Subtotal: ${formatRupiah(order.subtotal)}</p>
        <p><strong>Total: ${formatRupiah(order.total)}</strong></p>
      </div>
      ${order.catatan ? `
        <div class="detail-section">
          <h4>Catatan</h4>
          <p>${order.catatan}</p>
        </div>
      ` : ''}
    </div>
  `;

  document.getElementById('orderDetailContent').innerHTML = detail;
  document.getElementById('orderDetailModal').style.display = 'flex';
}

function closeOrderDetailModal() {
  document.getElementById('orderDetailModal').style.display = 'none';
}

async function updateOrderStatus(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;

  const statuses = ['pending', 'dibayar', 'diproses', 'dikirim', 'selesai', 'dibatalkan'];
  const statusOptions = statuses.map(s => 
    `<option value="${s}" ${s === order.status ? 'selected' : ''}>${getStatusText(s)}</option>`
  ).join('');

  const newStatus = prompt(
    `Update status order #${order.id.substring(0, 8)}\n\n` +
    `Status saat ini: ${getStatusText(order.status)}\n\n` +
    `Pilih status baru:\n` +
    `1. Pending\n2. Dibayar\n3. Diproses\n4. Dikirim\n5. Selesai\n6. Dibatalkan\n\n` +
    `Masukkan nomor (1-6):`,
    '1'
  );

  if (!newStatus) return;

  const statusIndex = parseInt(newStatus) - 1;
  if (statusIndex < 0 || statusIndex >= statuses.length) {
    alert('Pilihan tidak valid');
    return;
  }

  try {
    showLoading();
    const { error } = await supabase
      .from('orders')
      .update({ status: statuses[statusIndex] })
      .eq('id', orderId);

    if (error) throw error;

    loadOrders();
    alert('Status order berhasil diupdate!');
  } catch (error) {
    console.error('Error updating order status:', error);
    alert('Gagal mengupdate status: ' + error.message);
  } finally {
    hideLoading();
  }
}

function contactCustomer(phone, orderId) {
  const message = `Halo, terima kasih sudah order di toko kami!%0A%0AOrder ID: ${orderId.substring(0, 8)}`;
  window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
}

// ===== UTILITIES =====
function formatRupiah(angka) {
  return 'Rp' + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function showLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = 'flex';
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = 'none';
}

function logout() {
  sessionStorage.removeItem('adminLoggedIn');
  window.location.href = 'index.html';
}

// Check if logged in (untuk halaman yang memerlukan auth)
function checkAuth() {
  if (!sessionStorage.getItem('adminLoggedIn')) {
    window.location.href = 'index.html';
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function() {
  // Check if on login page
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Check if on produk page
  const produkForm = document.getElementById('produkForm');
  if (produkForm) {
    checkAuth();
    loadProdukAdmin();
    produkForm.addEventListener('submit', saveProduk);
  }

  // Check if on order page
  const ordersTable = document.getElementById('ordersTableBody');
  if (ordersTable) {
    checkAuth();
    loadOrders();
  }

  // Modal close handlers
  window.onclick = function(event) {
    const produkModal = document.getElementById('produkModal');
    const orderModal = document.getElementById('orderDetailModal');
    
    if (event.target === produkModal) {
      closeProdukModal();
    }
    if (event.target === orderModal) {
      closeOrderDetailModal();
    }
  };
});
