/**
 * ============================================================================
 * SISTEM OTOMASI SURAT BEBAS PINJAM PUSTAKA KURIKURATORIUM FPMIPA UPI
 * Core Application Controller - js/app.js
 * Single-Card Wizard 3-Langkah, Validasi Ketat, Sanitasi, dan Penanganan Status
 * ============================================================================
 */

import { CONFIG } from './config.js';
import { authService } from './auth.js';
import { ApiClient } from './api.js';
import { ScrollEffects } from './scroll-effects.js';

class AppController {
  constructor() {
    this.currentStep = 1;
    this.user = null;
    this.pendingPayload = null;

    // Cache DOM Elements
    this.dom = {
      // Stepper
      stepperProgress: document.getElementById('stepperProgressBar'),
      stepIndicators: [
        document.getElementById('stepIndicator1'),
        document.getElementById('stepIndicator2'),
        document.getElementById('stepIndicator3')
      ],

      // Wizard Steps Containers
      step1: document.getElementById('step1'),
      step2: document.getElementById('step2'),
      step3: document.getElementById('step3'),

      // User Profile Display (Step 2)
      userAvatar: document.getElementById('userAvatar'),
      userNameDisplay: document.getElementById('userNameDisplay'),
      userEmailDisplay: document.getElementById('userEmailDisplay'),
      btnSwitchAccount: document.getElementById('btnSwitchAccount'),

      // Form Elements (Step 2)
      form: document.getElementById('requestForm'),
      inputNama: document.getElementById('inputNama'),
      inputEmail: document.getElementById('inputEmail'),
      selectProdi: document.getElementById('selectProdi'),
      inputNim: document.getElementById('inputNim'),
      btnSubmit: document.getElementById('btnSubmitRequest'),

      // Error Messages
      groupNama: document.getElementById('groupNama'),
      groupProdi: document.getElementById('groupProdi'),
      groupNim: document.getElementById('groupNim'),
      errorNama: document.getElementById('errorNama'),
      errorProdi: document.getElementById('errorProdi'),
      errorNim: document.getElementById('errorNim'),

      // Step 3 Content
      resultContainer: document.getElementById('resultContainer'),
      step3Desc: document.getElementById('step3Desc'),
      btnResetWizard: document.getElementById('btnResetWizard'),

      // Urgency Modal Elements
      urgencyModal: document.getElementById('urgencyModal'),
      urgencyModalDetail: document.getElementById('urgencyModalDetail'),
      inputAlasanUrgensi: document.getElementById('inputAlasanUrgensi'),
      errorUrgensi: document.getElementById('errorUrgensi'),
      btnCancelUrgency: document.getElementById('btnCancelUrgency'),
      btnConfirmUrgency: document.getElementById('btnConfirmUrgency'),

      // Loading Overlay
      loadingOverlay: document.getElementById('loadingOverlay'),
      loadingTitle: document.getElementById('loadingTitle'),
      loadingDesc: document.getElementById('loadingDesc')
    };
  }

  /**
   * Inisialisasi awal aplikasi
   */
  init() {
    this.populateProdiDropdown();
    this.bindEvents();

    // Inisialisasi Otentikasi Google
    authService.init(
      this.handleLoginSuccess.bind(this),
      this.handleLogout.bind(this)
    );

    this.goToStep(1);
  }

  /**
   * Mengisi dropdown program studi dari config.js
   */
  populateProdiDropdown() {
    const select = this.dom.selectProdi;
    if (!select) return;

    // Bersihkan opsi lama kecuali placeholder
    select.innerHTML = '<option value="" disabled selected>-- Pilih Program Studi --</option>';

    CONFIG.FPMIPA_PRODI_LIST.forEach((prodi) => {
      const option = document.createElement('option');
      option.value = prodi;
      option.textContent = prodi;
      select.appendChild(option);
    });
  }

  /**
   * Event Listeners Binding
   */
  bindEvents() {
    // Tombol Ganti Akun di Langkah 2
    if (this.dom.btnSwitchAccount) {
      this.dom.btnSwitchAccount.addEventListener('click', () => {
        if (confirm('Apakah Anda yakin ingin mengganti akun Google @upi.edu?')) {
          authService.signOut();
        }
      });
    }

    // Submit Form Langkah 2
    if (this.dom.form) {
      this.dom.form.addEventListener('submit', this.handleFormSubmit.bind(this));
    }

    // Real-time Input Sanitization & Validation Reset
    if (this.dom.inputNim) {
      this.dom.inputNim.addEventListener('input', (e) => {
        // Otomatis uppercase dan hapus karakter non-alphanumeric
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        this.clearError(this.dom.groupNim);
      });
    }

    if (this.dom.inputNama) {
      this.dom.inputNama.addEventListener('input', () => {
        this.clearError(this.dom.groupNama);
      });
    }

    if (this.dom.selectProdi) {
      this.dom.selectProdi.addEventListener('change', () => {
        this.clearError(this.dom.groupProdi);
      });
    }

    // Tombol Reset / Kembali di Langkah 3
    if (this.dom.btnResetWizard) {
      this.dom.btnResetWizard.addEventListener('click', () => {
        this.goToStep(2);
      });
    }

    // Modal Urgensi Action Buttons
    if (this.dom.btnCancelUrgency) {
      this.dom.btnCancelUrgency.addEventListener('click', () => {
        this.closeUrgencyModal();
      });
    }

    if (this.dom.btnConfirmUrgency) {
      this.dom.btnConfirmUrgency.addEventListener('click', this.handleUrgencyConfirm.bind(this));
    }

    // Escape key listener untuk menutup modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.dom.urgencyModal.classList.contains('active')) {
        this.closeUrgencyModal();
      }
    });
  }

  /**
   * Navigasi antar langkah pada Single-Card Wizard
   * @param {number} stepNumber - 1, 2, atau 3
   */
  goToStep(stepNumber) {
    this.currentStep = stepNumber;

    // Sembunyikan seluruh langkah
    this.dom.step1.classList.remove('active');
    this.dom.step2.classList.remove('active');
    this.dom.step3.classList.remove('active');

    // Tampilkan langkah yang dituju
    if (stepNumber === 1) this.dom.step1.classList.add('active');
    if (stepNumber === 2) this.dom.step2.classList.add('active');
    if (stepNumber === 3) this.dom.step3.classList.add('active');

    // Perbarui Tampilan Stepper
    this.updateStepperUI(stepNumber);

    // Auto-scroll halus ke bagian atas kartu
    ScrollEffects.scrollToCardTop();
  }

  /**
   * Memperbarui UI indikator langkah
   * @param {number} stepNumber
   */
  updateStepperUI(stepNumber) {
    const progressWidths = ['0%', '50%', '100%'];
    this.dom.stepperProgress.style.width = progressWidths[stepNumber - 1];

    this.dom.stepIndicators.forEach((indicator, index) => {
      const stepIdx = index + 1;
      indicator.classList.remove('active', 'completed');

      if (stepIdx === stepNumber) {
        indicator.classList.add('active');
      } else if (stepIdx < stepNumber) {
        indicator.classList.add('completed');
      }
    });
  }

  /**
   * Callback saat login berhasil
   * @param {object} user - Data user Google
   */
  handleLoginSuccess(user) {
    this.user = user;

    // Isi tampilan profil pada Langkah 2
    if (this.dom.userNameDisplay) this.dom.userNameDisplay.textContent = user.name;
    if (this.dom.userEmailDisplay) this.dom.userEmailDisplay.textContent = user.email;

    if (this.dom.userAvatar) {
      if (user.picture) {
        this.dom.userAvatar.innerHTML = `<img src="${user.picture}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      } else {
        const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
        this.dom.userAvatar.textContent = initial;
      }
    }

    // Isi formulir
    if (this.dom.inputNama) this.dom.inputNama.value = user.name;
    if (this.dom.inputEmail) this.dom.inputEmail.value = user.email;

    // Lanjut otomatis ke Langkah 2
    this.goToStep(2);
  }

  /**
   * Callback saat logout
   */
  handleLogout() {
    this.user = null;
    this.pendingPayload = null;

    if (this.dom.form) this.dom.form.reset();
    this.goToStep(1);
  }

  /**
   * Validasi dan Sanitasi Formulir Langkah 2
   */
  validateForm() {
    let isValid = true;

    // 1. Sanitasi dan Validasi Nama
    const nama = this.dom.inputNama.value.trim();
    if (!nama || nama.length < 3) {
      this.showError(this.dom.groupNama, 'Nama lengkap wajib diisi minimal 3 karakter.');
      isValid = false;
    } else {
      this.clearError(this.dom.groupNama);
    }

    // 2. Validasi Prodi
    const prodi = this.dom.selectProdi.value;
    if (!prodi || !CONFIG.FPMIPA_PRODI_LIST.includes(prodi)) {
      this.showError(this.dom.groupProdi, 'Silakan pilih program studi resmi di FPMIPA.');
      isValid = false;
    } else {
      this.clearError(this.dom.groupProdi);
    }

    // 3. Sanitasi dan Validasi NIM (Huruf besar, trim, 7-15 karakter)
    const nim = this.dom.inputNim.value.trim().toUpperCase();
    const nimRegex = /^[A-Z0-9]{7,15}$/;
    if (!nim || !nimRegex.test(nim)) {
      this.showError(this.dom.groupNim, 'NIM tidak valid. Masukkan 7-15 karakter alfanumerik tanpa spasi.');
      isValid = false;
    } else {
      this.clearError(this.dom.groupNim);
    }

    return isValid;
  }

  showError(groupElement, message) {
    if (groupElement) {
      groupElement.classList.add('has-error');
      const errEl = groupElement.querySelector('.form-error-msg');
      if (errEl && message) errEl.textContent = message;
    }
  }

  clearError(groupElement) {
    if (groupElement) {
      groupElement.classList.remove('has-error');
    }
  }

  /**
   * Submit Handler Formulir Langkah 2
   * @param {Event} e
   */
  async handleFormSubmit(e) {
    e.preventDefault();

    if (!this.validateForm()) {
      return;
    }

    const payload = {
      nama: this.dom.inputNama.value.trim(),
      email: this.dom.inputEmail.value.trim().toLowerCase(),
      prodi: this.dom.selectProdi.value,
      nim: this.dom.inputNim.value.trim().toUpperCase(),
      isUrgent: false,
      alasanUrgensi: ""
    };

    this.pendingPayload = payload;
    await this.processVerificationRequest(payload);
  }

  /**
   * Memproses Request ke API Google Apps Script
   * @param {object} payload
   */
  async processVerificationRequest(payload) {
    this.showLoading(
      'Memeriksa Database...',
      'Sedang memverifikasi status peminjaman buku dan riwayat penerbitan surat di Kurikuratorium FPMIPA UPI...'
    );

    try {
      const response = await ApiClient.submitVerificationRequest(payload);
      this.hideLoading();

      // Penanganan Status Response dari Backend
      switch (response.status) {
        case CONFIG.STATUS.SUCCESS:
          this.renderSuccessView(response);
          this.goToStep(3);
          break;

        case CONFIG.STATUS.HAS_DEBT:
          this.renderHasDebtView(response);
          this.goToStep(3);
          break;

        case CONFIG.STATUS.REQUIRES_URGENCY:
          this.openUrgencyModal(response);
          break;

        case CONFIG.STATUS.INVALID_DOMAIN:
          alert('Permintaan ditolak: Akun email Anda tidak memiliki domain resmi @upi.edu.');
          authService.signOut();
          break;

        default:
          alert(response.message || 'Terjadi kendala saat memproses permohonan. Silakan coba kembali.');
          break;
      }
    } catch (error) {
      this.hideLoading();
      alert('Terjadi kesalahan jaringan atau server:\n' + error.message);
    }
  }

  /**
   * Render Tampilan Langkah 3: Sukses & Surat Terbit
   * @param {object} data - { nomorSurat, tanggalSurat, masaBerlaku, downloadUrl, previewUrl, verificationUrl, ... }
   */
  renderSuccessView(data) {
    this.dom.step3Desc.textContent = 'Selamat! Anda dinyatakan bebas dari segala pinjaman pustaka. Surat resmi Anda telah berhasil diterbitkan.';

    const downloadUrl = data.downloadUrl || '#';
    const previewUrl = data.previewUrl || '#';
    const nomorSurat = data.nomorSurat || 'T-XXXX/UN40.A4.8/TA.01.06/2026';
    const tanggalSurat = data.tanggalSurat || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const masaBerlaku = data.masaBerlaku || '6 (Enam) Bulan Sejak Tanggal Terbit';

    this.dom.resultContainer.innerHTML = `
      <div class="status-card-success">
        <div class="status-header-success">
          <div class="status-icon-success">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="status-meta">
            <h3>Bebas Pustaka Terverifikasi</h3>
            <p>Tidak ditemukan tanggungan peminjaman buku maupun denda pada basis data Kurikuratorium FPMIPA UPI.</p>
          </div>
        </div>

        <div class="doc-details-grid">
          <div class="detail-item">
            <span class="detail-label">Nomor Surat Resmi</span>
            <span class="detail-value highlight">${nomorSurat}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Tanggal Diterbitkan</span>
            <span class="detail-value">${tanggalSurat}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Nama Mahasiswa</span>
            <span class="detail-value">${this.pendingPayload ? this.pendingPayload.nama : '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">NIM / Program Studi</span>
            <span class="detail-value">${this.pendingPayload ? this.pendingPayload.nim + ' (' + this.pendingPayload.prodi + ')' : '-'}</span>
          </div>
          <div class="detail-item" style="grid-column: 1 / -1;">
            <span class="detail-label">Masa Berlaku Dokumen</span>
            <span class="detail-value">${masaBerlaku}</span>
          </div>
        </div>

        <div class="electronic-legality-box">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <div>
            <strong>Legalitas Dokumen Elektronik:</strong> Surat ini adalah dokumen resmi yang diterbitkan secara elektronik oleh Sistem Otomasi Kurikuratorium FPMIPA UPI tanpa tanda tangan basah dan stempel fisik. Dokumen dilengkapi <strong>Dynamic QR Code</strong> yang memuat tautan verifikasi keabsahan surat secara real-time.
          </div>
        </div>

        <div class="action-buttons-group">
          <a href="${downloadUrl}" class="btn btn-success" id="btnDownloadPdf" target="_blank" rel="noopener noreferrer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download PDF Surat
          </a>

          <a href="${previewUrl}" class="btn btn-outline" id="btnPreviewDrive" target="_blank" rel="noopener noreferrer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Preview di Drive
          </a>
        </div>
      </div>
    `;
  }

  /**
   * Render Tampilan Langkah 3: Ada Tanggungan Buku
   * @param {object} data - { items: [ { judul, barcode, tglPinjam, denda }, ... ] }
   */
  renderHasDebtView(data) {
    this.dom.step3Desc.textContent = 'Penerbitan surat ditangguhkan karena Anda masih memiliki pinjaman buku yang belum dikembalikan.';

    const items = data.items || [];
    let tableRows = '';

    if (items.length > 0) {
      tableRows = items.map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${item.judul || 'Buku Kurikuratorium'}</strong></td>
          <td><code>${item.barcode || '-'}</code></td>
          <td>${item.tglPinjam || '-'}</td>
          <td><span class="book-badge">${item.denda ? 'Rp ' + Number(item.denda).toLocaleString('id-ID') : 'Belum Kembali'}</span></td>
        </tr>
      `).join('');
    } else {
      tableRows = `
        <tr>
          <td colspan="5" style="text-align:center;color:#64748B;">Data rincian buku belum tercatat rinci. Silakan konfirmasi langsung ke petugas.</td>
        </tr>
      `;
    }

    this.dom.resultContainer.innerHTML = `
      <div class="status-card-danger">
        <div class="status-header-danger">
          <div class="status-icon-danger">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div class="status-meta-danger">
            <h3>Perhatian: Masih Memiliki Tanggungan Buku</h3>
            <p>Berdasarkan catatan pangkalan data Kurikuratorium FPMIPA UPI, Anda belum menyelesaikan pengembalian koleksi pustaka berikut:</p>
          </div>
        </div>

        <!-- Tabel Rincian Buku Pinjaman -->
        <div class="table-responsive">
          <table class="book-table">
            <thead>
              <tr>
                <th style="width: 40px;">No</th>
                <th>Judul Buku</th>
                <th>Barcode / Call No</th>
                <th>Tanggal Pinjam</th>
                <th>Status / Denda</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>

        <!-- Panduan Lokasi & Penyelesaian -->
        <div class="clearance-guide-box">
          <h4>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Alur Penyelesaian Tanggungan Pustaka:
          </h4>
          <ol class="guide-step-list">
            <li>Kunjungi <strong>${CONFIG.OFFICE_INFO.name}</strong>, berlokasi di <strong>${CONFIG.OFFICE_INFO.location}</strong>.</li>
            <li>Waktu operasional pelayanan: <strong>${CONFIG.OFFICE_INFO.operationalHours}</strong>.</li>
            <li>Serahkan fisik buku pinjaman ke petugas sirkulasi untuk dilakukan pemindaian barcode dan penghapusan tanggungan di sistem.</li>
            <li>Setelah buku diterima oleh petugas, buka kembali aplikasi ini dan lakukan permohonan ulang untuk langsung mengunduh Surat Bebas Pustaka Anda.</li>
          </ol>
        </div>

        <!-- Bantuan & Kontak Petugas -->
        <div class="contact-helpdesk-box">
          <div>
            <strong>Butuh Bantuan atau Klarifikasi?</strong>
            <p style="font-size:0.75rem; color:#64748B; margin-top:2px;">Hubungi staf helpdesk Kurikuratorium FPMIPA UPI via WhatsApp.</p>
          </div>
          <a href="${CONFIG.OFFICE_INFO.whatsappLink}" target="_blank" rel="noopener noreferrer" class="btn-contact-wa">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            Hubungi Petugas
          </a>
        </div>
      </div>
    `;
  }

  /**
   * Membuka Pop-Up Modal Alasan Urgensi
   * @param {object} response - { existingNomor, existingDate, message }
   */
  openUrgencyModal(response) {
    const existingNomor = response.existingNomor || 'surat sebelumnya';
    const existingDate = response.existingDate ? `pada tanggal ${response.existingDate}` : '';

    this.dom.urgencyModalDetail.textContent =
      `Sistem mendeteksi bahwa Surat Bebas Pustaka atas NIM ${this.pendingPayload.nim} telah diterbitkan dengan Nomor ${existingNomor} ${existingDate}. ` +
      `Sesuai regulasi, penerbitan normal dibatasi 1 (satu) kali. Silakan lengkapi alasan pengajuan ulang di bawah ini agar permohonan dapat diproses kembali.`;

    this.dom.inputAlasanUrgensi.value = '';
    this.dom.errorUrgensi.style.display = 'none';
    this.dom.urgencyModal.classList.add('active');
    this.dom.inputAlasanUrgensi.focus();
  }

  /**
   * Menutup Modal Urgensi
   */
  closeUrgencyModal() {
    this.dom.urgencyModal.classList.remove('active');
  }

  /**
   * Konfirmasi Pengiriman Ulang dengan Alasan Urgensi
   */
  async handleUrgencyConfirm() {
    const alasan = this.dom.inputAlasanUrgensi.value.trim();

    if (!alasan || alasan.length < 10) {
      this.dom.errorUrgensi.style.display = 'block';
      this.dom.errorUrgensi.textContent = 'Alasan urgensi wajib diisi minimal 10 karakter.';
      return;
    }

    this.dom.errorUrgensi.style.display = 'none';
    this.closeUrgencyModal();

    // Perbarui payload dengan flag urgensi
    const urgentPayload = {
      ...this.pendingPayload,
      isUrgent: true,
      alasanUrgensi: alasan
    };

    await this.processVerificationRequest(urgentPayload);
  }

  /**
   * Menampilkan Loading Overlay dengan teks dinamis
   * @param {string} title
   * @param {string} desc
   */
  showLoading(title, desc) {
    if (this.dom.loadingTitle) this.dom.loadingTitle.textContent = title;
    if (this.dom.loadingDesc) this.dom.loadingDesc.textContent = desc;

    this.dom.loadingOverlay.classList.add('active');
    this.dom.loadingOverlay.setAttribute('aria-busy', 'true');

    // Nonaktifkan tombol agar tidak terjadi double submit
    if (this.dom.btnSubmit) this.dom.btnSubmit.disabled = true;
    if (this.dom.btnConfirmUrgency) this.dom.btnConfirmUrgency.disabled = true;
  }

  /**
   * Menyembunyikan Loading Overlay
   */
  hideLoading() {
    this.dom.loadingOverlay.classList.remove('active');
    this.dom.loadingOverlay.setAttribute('aria-busy', 'false');

    if (this.dom.btnSubmit) this.dom.btnSubmit.disabled = false;
    if (this.dom.btnConfirmUrgency) this.dom.btnConfirmUrgency.disabled = false;
  }
}

// Bootstrapping App saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
  const app = new AppController();
  app.init();
});
