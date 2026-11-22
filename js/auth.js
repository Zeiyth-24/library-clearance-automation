/**
 * ============================================================================
 * SISTEM OTOMASI SURAT BEBAS PINJAM PUSTAKA KURIKURATORIUM FPMIPA UPI
 * Authentication Module - js/auth.js
 * Google Identity Services (GIS) API dengan Validasi Ketat Domain @upi.edu
 * ============================================================================
 */

import { CONFIG } from './config.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.onLoginSuccessCallback = null;
    this.onLogoutCallback = null;
  }

  /**
   * Helper untuk mendekode JWT Credential dari Google secara aman
   * Termasuk penanganan karakter Unicode
   * @param {string} token - JWT token string
   * @returns {object|null}
   */
  decodeJwtPayload(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('[AuthService] Gagal mendekode token JWT:', error);
      return null;
    }
  }

  /**
   * Inisialisasi Google Identity Services (GIS)
   * @param {Function} onLoginSuccess - Callback ketika berhasil login dengan email @upi.edu
   * @param {Function} onLogout - Callback ketika logout/ganti akun
   */
  init(onLoginSuccess, onLogout) {
    this.onLoginSuccessCallback = onLoginSuccess;
    this.onLogoutCallback = onLogout;

    // Tunggu library GIS Google selesai dimuat
    if (window.google && window.google.accounts) {
      this.setupGoogleIdentity();
    } else {
      const checkGisInterval = setInterval(() => {
        if (window.google && window.google.accounts) {
          clearInterval(checkGisInterval);
          this.setupGoogleIdentity();
        }
      }, 100);
    }
  }

  /**
   * Konfigurasi & Render Tombol GIS
   */
  setupGoogleIdentity() {
    try {
      window.google.accounts.id.initialize({
        client_id: CONFIG.GOOGLE_CLIENT_ID,
        callback: this.handleCredentialResponse.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true,
        hosted_domain: CONFIG.ALLOWED_DOMAIN // Hint untuk Google hanya menampilkan akun UPI jika memungkinkan
      });

      const btnContainer = document.getElementById('googleSignInBtn');
      if (btnContainer) {
        window.google.accounts.id.renderButton(btnContainer, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'rectangular',
          text: 'signin_with',
          logo_alignment: 'left',
          width: 300
        });
      }
    } catch (err) {
      console.error('[AuthService] Error saat menginisialisasi GIS:', err);
    }
  }

  /**
   * Menangani response kredensial JWT dari Google
   * @param {object} response - { credential: string, ... }
   */
  handleCredentialResponse(response) {
    if (!response || !response.credential) {
      alert('Otentikasi dibatalkan atau token tidak ditemukan. Silakan coba kembali.');
      return;
    }

    const payload = this.decodeJwtPayload(response.credential);
    if (!payload || !payload.email) {
      alert('Gagal memverifikasi identitas profil Google. Silakan coba lagi.');
      return;
    }

    const userEmail = payload.email.trim().toLowerCase();
    const domainPart = userEmail.split('@')[1];

    // Validasi ketat domain @upi.edu
    if (domainPart !== CONFIG.ALLOWED_DOMAIN.toLowerCase()) {
      // Nonaktifkan auto-select Google agar mahasiswa bisa memilih akun lain
      if (window.google && window.google.accounts) {
        window.google.accounts.id.disableAutoSelect();
      }

      alert(
        `Akses Ditolak!\n\nAnda terdeteksi masuk menggunakan akun:\n${payload.email}\n\n` +
        `Sistem Otomasi Kurikuratorium FPMIPA UPI hanya dapat diakses oleh akun resmi civitas akademika berakhiran @${CONFIG.ALLOWED_DOMAIN}.\n` +
        `Silakan pilih akun Google @upi.edu Anda.`
      );

      this.currentUser = null;
      return;
    }

    // Jika lolos validasi @upi.edu
    this.currentUser = {
      name: payload.name || 'Mahasiswa UPI',
      email: userEmail,
      picture: payload.picture || '',
      sub: payload.sub
    };

    console.log('[AuthService] Berhasil login sebagai:', this.currentUser.email);

    if (typeof this.onLoginSuccessCallback === 'function') {
      this.onLoginSuccessCallback(this.currentUser);
    }
  }

  /**
   * Dapatkan user yang sedang aktif
   * @returns {object|null}
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Keluar / Ganti Akun
   */
  signOut() {
    this.currentUser = null;
    if (window.google && window.google.accounts) {
      window.google.accounts.id.disableAutoSelect();
    }

    if (typeof this.onLogoutCallback === 'function') {
      this.onLogoutCallback();
    }
  }
}

export const authService = new AuthService();
