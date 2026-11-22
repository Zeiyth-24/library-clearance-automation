/**
 * ============================================================================
 * SISTEM OTOMASI SURAT BEBAS PINJAM PUSTAKA KURIKURATORIUM FPMIPA UPI
 * API Client Module - js/api.js
 * Komunikasi Serverless ke Google Apps Script tanpa CORS Preflight Issue
 * ============================================================================
 */

import { CONFIG } from './config.js';

export const ApiClient = {
  /**
   * Mengirim permohonan penerbitan surat ke Google Apps Script Web App
   * Menggunakan format 'text/plain;charset=utf-8' dengan payload JSON string.
   * Format ini diklasifikasikan sebagai "Simple Request" oleh browser, sehingga
   * sama sekali TIDAK memicu HTTP OPTIONS Preflight yang sering bermasalah di Google Apps Script.
   *
   * @param {object} payload - { nama, email, nim, prodi, isUrgent, alasanUrgensi }
   * @returns {Promise<object>}
   */
  async submitVerificationRequest(payload) {
    const url = CONFIG.GAS_API_URL;

    // Validasi konfigurasi endpoint
    if (!url || url.includes('SAMPLE_DEPLOYMENT_ID')) {
      throw new Error(
        'Endpoint Google Apps Script belum dikonfigurasi di js/config.js. ' +
        'Silakan deploy Code.gs terlebih dahulu dan masukkan URL Web App yang valid.'
      );
    }

    // Siapkan controller untuk timeout (maksimal 50 detik karena proses pembuatan PDF di GAS butuh beberapa detik)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          // KUNCI PENTING: text/plain mencegah CORS OPTIONS Preflight
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server mengembalikan status HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.error('[ApiClient] Response bukan format JSON yang valid:', responseText);
        throw new Error('Format respon dari server tidak sesuai standar.');
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Permintaan waktu habis (timeout). Server membutuhkan waktu lebih lama untuk memproses PDF. Silakan coba beberapa saat lagi.');
      }

      console.error('[ApiClient] Kesalahan saat memanggil GAS API:', error);
      throw error;
    }
  }
};
