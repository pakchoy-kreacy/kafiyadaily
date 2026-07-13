// Logic untuk halaman toko (index.html)

let cart = [];
let allProduk = [];
let filteredProduk = [];
let currentKategori = 'semua';

// Load cart dari localStorage
function loadCart() {
  const saved = localStorage.getItem('cart');
  if (saved) {
    cart = JSON.parse(saved);
    updateCartBadge();
  }
}

// Save cart ke localStorage
function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartBadge();
}

// Update badge qty di icon keranjang
function updateCartBadge() {
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const badge = document.getElementById('cartBadge');
  if (badge) {
    badge.textContent = totalQty;
    badge.style.display = totalQty > 0 ? 'flex' : 'none';
  }
}

// Load setting toko dari Supabase
async function loadTokoSetting() {
  try {
    const { data, error } = await supabase
      .from('setting')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) throw error;

    // Update nama toko
    const namaTokoEl = document.getElementById('namaTokoHeader');
    if (namaTokoEl) namaTokoEl.textContent = data.nama_toko || 'Toko Cantik';

    const namaTokoFooter = document.getElementById('namaTokoFooter');
    if (namaTokoFooter) namaTokoFooter.textContent = data.nama_toko || 'Toko Cantik';

    // Update banner
    const bannerEl = document.getElementById('heroBanner');
    if (bannerEl && data.banner_url) {
      bannerEl.style.backgroundImage = `url(${data.banner_url})`;
    }

    // Update kota
    const kotaEl = document.getElementById('kotaToko');
    if (kotaEl) kotaEl.textContent = data.kota_asal_nama || 'Magetan';

    // Update WA number
    const waEl = document.getElementById('waTokoFooter');
    if (waEl) waEl.textContent = data.wa_number || '6281226123571';

    // Update tema warna jika ada
    if (data.tema_warna) {
      document.documentElement.style.setProperty('--primary', data.tema_warna);
    }

  } catch (error) {
    console.error('Error loading toko setting:', error);
  }
}

// Load produk dari Supabase
async function loadProduk() {
  try {
    showSkeletonLoader();

    const { data, error } = await supabase
      .from('produk')
      .select('*')
      .eq('aktif', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    allProduk = data;
    filteredProduk = data;
    renderProduk();

  } catch (error) {
    console.error('Error loading produk:', error);
    document.getElementById('produkGrid').innerHTML = `
      <div class="error-message">
        <p>Gagal memuat produk. Silakan refresh halaman.</p>
      </div>
    `;
  }
}

// Filter produk by kategori
function filterByKategori(kategori) {
  currentKategori = kategori;
  
  // Update active button
  document.querySelectorAll('.kategori-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');

  // Filter produk
  if (kategori === 'semua') {
    filteredProduk = allProduk;
  } else {
    filteredProduk = allProduk.filter(p => p.kategori === kategori);
  }

  renderProduk();
}

// Render produk ke grid
function renderProduk() {
  const grid = document.getElementById('produkGrid');
  
  if (filteredProduk.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <p>Belum ada produk</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredProduk.map(produk => `
    <div class="produk-card">
      <div class="produk-foto">
        <img src="${produk.foto_url || 'https://picsum.photos/seed/' + produk.id + '/400/400'}" 
             alt="${produk.nama}"
             loading="lazy">
        ${produk.stok === 0 ? '<div class="badge-stok-habis">Stok Habis</div>' : ''}
      </div>
      <div class="produk-info">
        <h3 class="produk-nama">${produk.nama}</h3>
        <p class="produk-harga">${formatRupiah(produk.harga)}</p>
        <p class="produk-stok">Stok: ${produk.stok}</p>
        ${produk.stok > 0 ? `
          <button class="btn btn-primary btn-sm" onclick="addToCart('${produk.id}')">
            Beli
          </button>
        ` : `
          <button class="btn btn-disabled btn-sm" disabled>
            Stok Habis
          </button>
        `}
      </div>
    </div>
  `).join('');
}

// Show skeleton loader
function showSkeletonLoader() {
  const grid = document.getElementById('produkGrid');
  grid.innerHTML = Array(6).fill('').map(() => `
    <div class="produk-card skeleton">
      <div class="skeleton-foto"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-text short"></div>
    </div>
  `).join('');
}

// Format harga ke Rupiah
function formatRupiah(angka) {
  return 'Rp' + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Add produk ke cart
function addToCart(produkId) {
  const produk = allProduk.find(p => p.id === produkId);
  if (!produk) return;

  const existingItem = cart.find(item => item.id === produkId);
  
  if (existingItem) {
    // Cek stok
    if (existingItem.qty >= produk.stok) {
      alert('Stok tidak cukup!');
      return;
    }
    existingItem.qty++;
  } else {
    cart.push({
      id: produk.id,
      nama: produk.nama,
      harga: produk.harga,
      foto_url: produk.foto_url,
      qty: 1
    });
  }

  saveCart();
  renderCart();
  openCart();

  // Animasi feedback
  const btn = event.target;
  btn.textContent = '✓ Ditambahkan';
  setTimeout(() => {
    btn.textContent = 'Beli';
  }, 1000);
}

// Render cart
function renderCart() {
  const cartItems = document.getElementById('cartItems');
  const cartEmpty = document.getElementById('cartEmpty');
  const cartContent = document.getElementById('cartContent');

  if (cart.length === 0) {
    cartEmpty.style.display = 'block';
    cartContent.style.display = 'none';
    return;
  }

  cartEmpty.style.display = 'none';
  cartContent.style.display = 'block';

  cartItems.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.foto_url || 'https://picsum.photos/seed/' + item.id + '/100/100'}" 
           alt="${item.nama}">
      <div class="cart-item-info">
        <h4>${item.nama}</h4>
        <p class="cart-item-harga">${formatRupiah(item.harga)}</p>
      </div>
      <div class="cart-item-qty">
        <button onclick="updateCartQty('${item.id}', -1)">-</button>
        <span>${item.qty}</span>
        <button onclick="updateCartQty('${item.id}', 1)">+</button>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">×</button>
    </div>
  `).join('');

  // Update total
  const total = cart.reduce((sum, item) => sum + (item.harga * item.qty), 0);
  document.getElementById('cartTotal').textContent = formatRupiah(total);
}

// Update qty item di cart
function updateCartQty(produkId, delta) {
  const item = cart.find(i => i.id === produkId);
  if (!item) return;

  const produk = allProduk.find(p => p.id === produkId);
  
  item.qty += delta;

  if (item.qty <= 0) {
    removeFromCart(produkId);
    return;
  }

  // Cek stok
  if (produk && item.qty > produk.stok) {
    alert('Stok tidak cukup!');
    item.qty = produk.stok;
  }

  saveCart();
  renderCart();
}

// Remove item dari cart
function removeFromCart(produkId) {
  cart = cart.filter(item => item.id !== produkId);
  saveCart();
  renderCart();
}

// Open cart panel
function openCart() {
  document.getElementById('cartPanel').classList.add('active');
  document.getElementById('cartOverlay').classList.add('active');
}

// Close cart panel
function closeCart() {
  document.getElementById('cartPanel').classList.remove('active');
  document.getElementById('cartOverlay').classList.remove('active');
}

// Checkout
function goToCheckout() {
  if (cart.length === 0) {
    alert('Keranjang masih kosong!');
    return;
  }
  window.location.href = 'checkout.html';
}

// Init saat DOM ready
document.addEventListener('DOMContentLoaded', function() {
  loadCart();
  loadTokoSetting();
  loadProduk();
  renderCart();

  // Event listener untuk icon cart
  const cartIcon = document.getElementById('cartIcon');
  if (cartIcon) {
    cartIcon.addEventListener('click', openCart);
  }

  // Event listener untuk close cart
  const closeCartBtn = document.getElementById('closeCart');
  if (closeCartBtn) {
    closeCartBtn.addEventListener('click', closeCart);
  }

  const cartOverlay = document.getElementById('cartOverlay');
  if (cartOverlay) {
    cartOverlay.addEventListener('click', closeCart);
  }

  // Event listener untuk checkout button
  const checkoutBtn = document.getElementById('checkoutBtn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', goToCheckout);
  }
});
