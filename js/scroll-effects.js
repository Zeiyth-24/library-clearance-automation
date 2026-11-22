/**
 * ============================================================================
 * SISTEM OTOMASI SURAT BEBAS PINJAM PUSTAKA KURIKURATORIUM FPMIPA UPI
 * UX & Scroll Transitions - js/scroll-effects.js
 * Fokus: Transisi halus & auto-scroll kartu wizard, tanpa efek scroll fade-out
 * ============================================================================
 */

export const ScrollEffects = {
  /**
   * Menggeser tampilan layar secara halus ke bagian atas kartu wizard
   * Sangat berguna bagi pengguna mobile agar tidak kehilangan konteks saat berpindah langkah
   */
  scrollToCardTop() {
    const card = document.querySelector('.wizard-card');
    if (card) {
      const cardRect = card.getBoundingClientRect();
      const offsetTop = window.pageYOffset + cardRect.top - 24; // margin atas yang proporsional

      window.scrollTo({
        top: offsetTop > 0 ? offsetTop : 0,
        behavior: 'smooth'
      });
    }
  },

  /**
   * Menggeser tampilan ke elemen spesifik (misal hasil penerbitan)
   * @param {string} selector
   */
  scrollToElement(selector) {
    const el = document.querySelector(selector);
    if (el) {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  },

  /**
   * Inisialisasi awal saat dokumen dimuat
   */
  init() {
    // Memastikan transisi mount berjalan mulus
    document.addEventListener('DOMContentLoaded', () => {
      const wrapper = document.querySelector('.app-wrapper');
      if (wrapper && !wrapper.classList.contains('animate-mount')) {
        wrapper.classList.add('animate-mount');
      }
    });
  }
};

ScrollEffects.init();
