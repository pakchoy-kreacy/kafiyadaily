// RajaOngkir API helper functions

async function getCities() {
  try {
    const response = await fetch('https://api.rajaongkir.com/starter/city', {
      headers: {
        'key': CONFIG.RAJAONGKIR_KEY
      }
    });
    
    const result = await response.json();
    
    if (result.rajaongkir.status.code !== 200) {
      throw new Error('Gagal memuat daftar kota');
    }
    
    return result.rajaongkir.results;
  } catch (error) {
    console.error('Error getting cities:', error);
    throw error;
  }
}

async function checkOngkir(origin, destination, weight, courier = 'jne:tiki:pos') {
  try {
    const formData = new FormData();
    formData.append('origin', origin);
    formData.append('destination', destination);
    formData.append('weight', weight);
    formData.append('courier', courier);
    
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
    
    return result.rajaongkir.results;
  } catch (error) {
    console.error('Error checking ongkir:', error);
    throw error;
  }
}

// Export functions jika menggunakan module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getCities,
    checkOngkir
  };
}
