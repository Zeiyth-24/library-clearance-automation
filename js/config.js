/**
 * ============================================================================
 * SISTEM OTOMASI SURAT BEBAS PINJAM PUSTAKA KURIKURATORIUM FPMIPA UPI
 * Configuration File - js/config.js
 * ============================================================================
 */

export const CONFIG = {
  // Google Cloud OAuth 2.0 Web Client ID (Google Identity Services)
  // Replace with your own Client ID from Google Cloud Console
  GOOGLE_CLIENT_ID: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",

  // Google Apps Script Web App URL (Production Deployment /exec)
  // Replace with your own /exec URL after deploying google-apps-script/Code.gs
  GAS_API_URL: "https://script.google.com/macros/s/YOUR_GAS_DEPLOYMENT_ID/exec",

  // Domain resmi institusi yang diizinkan login
  ALLOWED_DOMAIN: "upi.edu",

  // Daftar 11 Program Studi Resmi di Lingkungan FPMIPA UPI
  FPMIPA_PRODI_LIST: [
    "Pendidikan Matematika",
    "Matematika",
    "Pendidikan Fisika",
    "Fisika",
    "Pendidikan Biologi",
    "Biologi",
    "Pendidikan Kimia",
    "Kimia",
    "Pendidikan Ilmu Komputer",
    "Ilmu Komputer",
    "Pendidikan IPA (IPSE)"
  ],

  // Informasi Lokasi Fisik & Helpdesk Kurikuratorium FPMIPA UPI
  OFFICE_INFO: {
    name: "Ruang Kurikuratorium FPMIPA UPI",
    location: "Lobi Utama Gedung FPMIPA UPI (Gedung JICA Lantai 1)",
    address: "Jl. Dr. Setiabudi No. 229, Kota Bandung, Jawa Barat 40154",
    operationalHours: "Senin - Jumat: 08.00 - 15.30 WIB",
    contactPerson: "Petugas Layanan Kurikuratorium FPMIPA UPI",
    whatsappNumber: "6280000000000", // Replace with active helpdesk WhatsApp number
    whatsappLink: "https://wa.me/6280000000000?text=Halo%20Petugas%20Kurikuratorium%20FPMIPA%20UPI,%20saya%20ingin%20mengonfirmasi%20pengembalian%20tanggungan%20buku.",
    emailHelpdesk: "kurikuratorium-helpdesk@example.edu"
  },

  // Status Response Code yang dikenali sistem
  STATUS: {
    SUCCESS: "SUCCESS",
    HAS_DEBT: "HAS_DEBT",
    REQUIRES_URGENCY: "REQUIRES_URGENCY",
    INVALID_DOMAIN: "INVALID_DOMAIN",
    ERROR: "ERROR"
  }
};
