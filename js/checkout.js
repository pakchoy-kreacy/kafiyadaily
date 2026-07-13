// Logic untuk halaman checkout

let cart = [];
let selectedKurir = null;
let ongkir = 0;
let selectedPayment = null;

// Load cart dari localStorage
function loadCart() {
  const saved = localStorage.getItem('cart');
  if (saved) {
    cart = JSON.parse(saved);
  }
  
  if (cart.length === 0) {
    window.location.href = 'index.html';
    return;
  }
  
  renderCheckoutItems();
  calculateSubtotal();
}

// Render items di checkout
function renderCheckoutItems() {
  const container = document.getElementById('checkoutItems');
  
  container.innerHTML = cart.map(item => `
    <div class="checkout-item">
      <img src="${item.foto_url || 'https://picsum.photos/seed/' + item.id + '/80/80'}" alt="${item.nama}">
      <div class="checkout-item-info">
        <h4>${item.nama}</h4>
        <p>${formatRupiah(item.harga)} × ${item.qty}</p>
      </div>
      <div class="checkout-item-total">
        ${formatRupiah(item.harga * item.qty)}
      </div>
    </div>
  `).join('');
}

// Calculate subtotal
function calculateSubtotal() {
  const subtotal = cart.reduce((sum, item) => sum + (item.harga * item.qty), 0);
  document.getElementById('subtotalAmount').textContent = formatRupiah(subtotal);
  calculateTotal();
}

// Calculate total (subtotal + ongkir)
function calculateTotal() {
  const subtotal = cart.reduce((sum, item) => sum + (item.harga * item.qty), 0);
  const total = subtotal + ongkir;
  document.getElementById('totalAmount').textContent = formatRupiah(total);
}

// Format rupiah
function formatRupiah(angka) {
  return 'Rp' + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Load kota dari RajaOngkir
async function loadKota() {
  try {
    const response = await fetch('https://api.rajaongkir.com/starter/city', {
      headers: {
        'key': CONFIG.RAJAONGKIR_KEY
      }
    });
    
    const result = await response.json();
    
    if (result.rajaongkir.status.code !== 200) {
      throw new Error('Gagal load kota');
    }
    
    const select = document.getElementById('kotaTujuan');
    select.innerHTML = '<option value="">Pilih Kota</option>' + 
      result.rajaongkir.results.map(kota => 
        `<option value="${kota.city_id}">${kota.type} ${kota.city_name}</option>`
      ).join('');
      
  } catch (error) {
    console.error('Error loading kota:', error);
    alert('Gagal memuat daftar kota. Silakan refresh halaman.');
  }
}

// Cek ongkir
async function cekOngkir() {
  const kotaTujuan = document.getElementById('kotaTujuan').value;
  
  if (!kotaTujuan) {
    alert('Pilih kota tujuan terlebih dahulu');
    return;
  }
  
  showLoading();
  
  try {
    // Hitung total berat (asumsi setiap item 500 gram)
    const totalBerat = cart.reduce((sum, item) => sum + (item.qty * 500), 0);
    
    const formData = new FormData();
    formData.append('origin', CONFIG.KOTA_ASAL_ID);
    formData.append('destination', kotaTujuan);
    formData.append('weight', totalBerat);
    formData.append('courier', 'jne:tiki:pos');
    
    const response = await fetch('https://api.rajaongkir.com/starter/cost', {
      method: 'POST',
      headers: {
        'key': CONFIG.RAJAONGKIR_KEY
      },
      body: formData
    });
    
    const result = await response.json();
    
    if (result.rajaongkir.status.code !== 200) {
      throw new Error('Gagal cek ongkir');
    }
    
    renderOngkirOptions(result.rajaongkir.results);
    document.getElementById('ongkirSection').style.display = 'block';
    
  } catch (error) {
    console.error('Error cek ongkir:', error);
    alert('Gagal cek ongkir: ' + error.message);
  } finally {
    hideLoading();
  }
}

// Render opsi ongkir
function renderOngkirOptions(results) {
  const container = document.getElementById('ongkirOptions');
  
  const options = [];
  results.forEach(kurir => {
    kurir.costs.forEach(service => {
      options.push({
        code: kurir.code.toUpperCase(),
        service: service.service,
        description: service.description,
        cost: service.cost[0].value,
        etd: service.cost[0].etd
      });
    });
  });
  
  container.innerHTML = options.map((opt, idx) => `
    <div class="ongkir-option">
      <input type="radio" name="kurir" id="kurir${idx}" value="${idx}">
      <label for="kurir${idx}">
        <div class="kurir-info">
          <strong>${opt.code} - ${opt.service}</strong>
          <span>${opt.description}</span>
          <span class="etd">Estimasi: ${opt.etd} hari</span>
        </div>
        <div class="kurir-price">
          ${formatRupiah(opt.cost)}
        </div>
      </label>
    </div>
  `).join('');
  
  // Event listener untuk pilih kurir
  document.querySelectorAll('input[name="kurir"]').forEach((radio, idx) => {
    radio.addEventListener('change', () => {
      selectedKurir = options[idx];
      ongkir = options[idx].cost;
      document.getElementById('ongkirAmount').textContent = formatRupiah(ongkir);
      calculateTotal();
      document.getElementById('paymentSection').style.display = 'block';
    });
  });
}

// Load payment methods
async function loadPaymentMethods() {
  // Untuk COD, tidak perlu hit API Tripay
  const codOption = {
    code: 'COD',
    name: 'Cash On Delivery (COD)',
    fee: 0
  };
  
  try {
    // Load payment channels dari Tripay
    const response = await fetch(`https://tripay.co.id/api/${CONFIG.TRIPAY_MODE}/payment/channel`, {
      headers: {
        'Authorization': 'Bearer ' + CONFIG.TRIPAY_API_KEY
      }
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error('Gagal load payment methods');
    }
    
    // Filter hanya QRIS, VA, dan Alfamart
    const filtered = result.data.filter(p => 
      p.group === 'Virtual Account' || 
      p.code === 'QRIS' || 
      p.code === 'ALFAMART' || 
      p.code === 'ALFAMIDI'
    );
    
    renderPaymentMethods([codOption, ...filtered]);
    
  } catch (error) {
    console.error('Error loading payment methods:', error);
    // Fallback hanya COD
    renderPaymentMethods([codOption]);
  }
}

// Render payment methods
function renderPaymentMethods(methods) {
  const container = document.getElementById('paymentOptions');
  
  container.innerHTML = methods.map((method, idx) => `
    <div class="payment-option">
      <input type="radio" name="payment" id="payment${idx}" value="${idx}">
      <label for="payment${idx}">
        <div class="payment-info">
          <strong>${method.name}</strong>
          ${method.fee > 0 ? `<span class="payment-fee">Biaya: ${formatRupiah(method.fee)}</span>` : ''}
        </div>
        <div class="payment-icon">
          ${method.code === 'COD' ? '💵' : '💳'}
        </div>
      </label>
    </div>
  `).join('');
  
  // Event listener untuk pilih payment
  document.querySelectorAll('input[name="payment"]').forEach((radio, idx) => {
    radio.addEventListener('change', () => {
      selectedPayment = methods[idx];
    });
  });
}

// Validate form
function validateForm() {
  const nama = document.getElementById('nama').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const alamat = document.getElementById('alamat').value.trim();
  const kotaTujuan = document.getElementById('kotaTujuan').value;
  
  if (!nama || !phone || !alamat || !kotaTujuan) {
    alert('Lengkapi semua data pengiriman');
    return false;
  }
  
  if (!selectedKurir) {
    alert('Pilih metode pengiriman');
    return false;
  }
  
  if (!selectedPayment) {
    alert('Pilih metode pembayaran');
    return false;
  }
  
  return true;
}

// Process order
async function processOrder() {
  if (!validateForm()) return;
  
  showLoading();
  
  try {
    // Ambil data form
    const nama = document.getElementById('nama').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const alamat = document.getElementById('alamat').value.trim();
    const kotaTujuan = document.getElementById('kotaTujuan');
    const kotaNama = kotaTujuan.options[kotaTujuan.selectedIndex].text;
    const catatan = document.getElementById('catatan').value.trim();
    
    const subtotal = cart.reduce((sum, item) => sum + (item.harga * item.qty), 0);
    const total = subtotal + ongkir;
    
    // Buat order di database
    const orderData = {
      customer_nama: nama,
      customer_phone: phone,
      customer_alamat: alamat,
      customer_kota: kotaNama,
      items: cart,
      subtotal: subtotal,
      ongkir: ongkir,
      total: total,
      kurir: `${selectedKurir.code} - ${selectedKurir.service}`,
      payment_method: selectedPayment.code,
      catatan: catatan,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    const { data: order, error } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single();
    
    if (error) throw error;
    
    // Kurangi stok produk
    for (const item of cart) {
      const { data: produk, error: produkError } = await supabase
        .from('produk')
        .select('stok')
        .eq('id', item.id)
        .single();
      
      if (produkError) throw produkError;
      
      const { error: updateError } = await supabase
        .from('produk')
        .update({ stok: produk.stok - item.qty })
        .eq('id', item.id);
      
      if (updateError) throw updateError;
    }
    
    // Jika COD, langsung redirect ke WA
    if (selectedPayment.code === 'COD') {
      redirectToWhatsApp(order);
      return;
    }
    
    // Jika payment gateway, buat transaksi Tripay
    const paymentUrl = await createTripayTransaction(order);
    
    // Clear cart
    localStorage.removeItem('cart');
    
    // Redirect ke halaman pembayaran atau sukses
    if (paymentUrl) {
      window.location.href = paymentUrl;
    } else {
      window.location.href = `sukses.html?order_id=${order.id}`;
    }
    
  } catch (error) {
    console.error('Error processing order:', error);
    alert('Gagal memproses order: ' + error.message);
  } finally {
    hideLoading();
  }
}

// Create Tripay transaction
async function createTripayTransaction(order) {
  try {
    const merchantRef = 'INV-' + Date.now();
    
    const signature = CryptoJS.HmacSHA256(
      CONFIG.TRIPAY_MERCHANT_CODE + merchantRef + order.total,
      CONFIG.TRIPAY_PRIVATE_KEY
    ).toString();
    
    const payload = {
      method: selectedPayment.code,
      merchant_ref: merchantRef,
      amount: order.total,
      customer_name: order.customer_nama,
      customer_email: 'customer@email.com', // Optional
      customer_phone: order.customer_phone,
      order_items: cart.map(item => ({
        name: item.nama,
        price: item.harga,
        quantity: item.qty
      })),
      return_url: window.location.origin + '/sukses.html?order_id=' + order.id,
      expired_time: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 jam
      signature: signature
    };
    
    const response = await fetch(`https://tripay.co.id/api/${CONFIG.TRIPAY_MODE}/transaction/create`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + CONFIG.TRIPAY_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message);
    }
    
    // Update order dengan payment reference
    await supabase
      .from('orders')
      .update({ 
        payment_reference: result.data.reference,
        payment_url: result.data.checkout_url
      })
      .eq('id', order.id);
    
    return result.data.checkout_url;
    
  } catch (error) {
    console.error('Error creating Tripay transaction:', error);
    return null;
  }
}

// Redirect ke WhatsApp (untuk COD)
function redirectToWhatsApp(order) {
  const items = cart.map(item => 
    `- ${item.nama} (${item.qty}x) = ${formatRupiah(item.harga * item.qty)}`
  ).join('%0A');
  
  const message = `Halo, saya ingin order:%0A%0A` +
    `*Order ID:* ${order.id}%0A` +
    `*Nama:* ${order.customer_nama}%0A` +
    `*Phone:* ${order.customer_phone}%0A` +
    `*Alamat:* ${order.customer_alamat}, ${order.customer_kota}%0A%0A` +
    `*Items:*%0A${items}%0A%0A` +
    `*Subtotal:* ${formatRupiah(order.subtotal)}%0A` +
    `*Ongkir (${order.kurir}):* ${formatRupiah(order.ongkir)}%0A` +
    `*Total:* ${formatRupiah(order.total)}%0A%0A` +
    `*Pembayaran:* Cash On Delivery (COD)%0A` +
    `${order.catatan ? `*Catatan:* ${order.catatan}` : ''}`;
  
  // Clear cart
  localStorage.removeItem('cart');
  
  // Redirect ke WA
  window.location.href = `https://wa.me/${CONFIG.WA_NUMBER}?text=${message}`;
}

// Show loading overlay
function showLoading() {
  document.getElementById('loadingOverlay').style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

// Init
document.addEventListener('DOMContentLoaded', function() {
  loadCart();
  loadKota();
  loadPaymentMethods();
  
  // Event listeners
  document.getElementById('cekOngkirBtn').addEventListener('click', cekOngkir);
  document.getElementById('checkoutForm').addEventListener('submit', function(e) {
    e.preventDefault();
    processOrder();
  });
});
