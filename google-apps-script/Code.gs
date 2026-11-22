/**
 * ============================================================================
 * SISTEM OTOMASI PENERBITAN SURAT BEBAS PINJAM PUSTAKA
 * KURIKURATORIUM FPMIPA - UNIVERSITAS PENDIDIKAN INDONESIA
 * Backend Serverless REST API - Google Apps Script (Code.gs)
 * ============================================================================
 * 
 * Fitur Utama:
 * 1. Validasi ketat Domain Email (@upi.edu) dan Prodi FPMIPA.
 * 2. Pengecekan status tanggungan pinjaman buku pada tab 'Tanggungan_Buku'.
 * 3. Pembatasan penerbitan 1x (Memerlukan Urgensi jika permohonan ulang).
 * 4. Penomoran otomatis berurutan bebas bentrok menggunakan LockService.getScriptLock().
 *    Format Nomor: T-[NomorAuto]/UN40.A4.8/TA.01.06/[Tahun]
 * 5. Generator Dokumen PDF berbasis Template Google Docs tanpa TTD basah/stempel.
 * 6. Dynamic QR Code legalitas elektronik (terhubung ke portal verifikasi online).
 * 7. Pengaturan otomatis akses Google Drive (ANYONE_WITH_LINK - View).
 * 8. Portal Verifikasi Keabsahan Surat Publik via Web App (doGet).
 * ============================================================================
 */

// ============================================================================
// KONFIGURASI SISTEM & ID RESOURCE GOOGLE WORKSPACE
// ============================================================================
var CONFIG = {
  // ID Spreadsheet Database (Ganti dengan ID Google Spreadsheet Anda)
  SPREADSHEET_ID: "PASTE_YOUR_SPREADSHEET_ID_HERE",

  // Nama Tab pada Spreadsheet
  SHEET_TANGGUNGAN: "Tanggungan_Buku",
  SHEET_LOG: "Log_Surat",
  SHEET_COUNTER: "Counter_Surat",

  // ID Template Google Docs (Ganti dengan ID Google Docs Template Anda)
  TEMPLATE_DOC_ID: "PASTE_YOUR_GOOGLE_DOC_TEMPLATE_ID_HERE",

  // ID Folder Google Drive tempat menyimpan arsip PDF
  OUTPUT_FOLDER_ID: "PASTE_YOUR_DRIVE_FOLDER_ID_HERE",

  // Domain Resmi Institusi
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

  // Format Penomoran Surat
  // Pola: T-[NomorAuto]/UN40.A4.8/TA.01.06/[Tahun]
  KODE_SURAT_PREFIX: "T-",
  KODE_SURAT_SUFFIX: "/UN40.A4.8/TA.01.06/"
};

// ============================================================================
// HTTP GET HANDLER: PORTAL VERIFIKASI KEABSAHAN PUBLIK (QR CODE SCANNER)
// ============================================================================
function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};

  // Jika URL dibuka dengan parameter ?verify=... (hasil scan QR Code)
  if (params.verify) {
    return renderVerificationPage(params.verify);
  }

  // Jika diakses biasa tanpa parameter, kembalikan status service JSON
  return ContentService.createTextOutput(
    JSON.stringify({
      status: "ONLINE",
      service: "API Sistem Otomasi Surat Bebas Pustaka Kurikuratorium FPMIPA UPI",
      timestamp: new Date().toISOString()
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// HTTP POST HANDLER: SERVERLESS API PENERBITAN SURAT
// ============================================================================
function doPost(e) {
  var lock = LockService.getScriptLock();

  try {
    // Ambil payload JSON dari request body (format text/plain atau form data)
    var postData = "";
    if (e && e.postData && e.postData.contents) {
      postData = e.postData.contents;
    } else if (e && e.parameter && e.parameter.payload) {
      postData = e.parameter.payload;
    }

    if (!postData) {
      return jsonResponse({
        success: false,
        status: "ERROR",
        message: "Data permohonan (payload) tidak ditemukan pada permintaan."
      });
    }

    var payload = JSON.parse(postData);

    // 1. Sanitasi Input String
    var nama = (payload.nama || "").trim();
    var email = (payload.email || "").trim().toLowerCase();
    var nim = (payload.nim || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    var prodi = (payload.prodi || "").trim();
    var isUrgent = payload.isUrgent === true;
    var alasanUrgensi = (payload.alasanUrgensi || "").trim();

    // 2. Validasi Parameter Wajib
    if (!nama || !email || !nim || !prodi) {
      return jsonResponse({
        success: false,
        status: "ERROR",
        message: "Seluruh kolom data (Nama, Email, NIM, dan Prodi) wajib dilengkapi."
      });
    }

    // 3. Validasi Domain Email @upi.edu
    var emailDomain = email.split("@")[1];
    if (emailDomain !== CONFIG.ALLOWED_DOMAIN.toLowerCase()) {
      return jsonResponse({
        success: false,
        status: "INVALID_DOMAIN",
        message: "Akses ditolak. Hanya akun dengan domain @upi.edu yang diizinkan."
      });
    }

    // 4. Validasi Program Studi FPMIPA
    if (CONFIG.FPMIPA_PRODI_LIST.indexOf(prodi) === -1) {
      return jsonResponse({
        success: false,
        status: "ERROR",
        message: "Program studi yang dipilih tidak termasuk dalam daftar resmi FPMIPA UPI."
      });
    }

    // 5. Kunci Skrip (LockService) Maksimal 30 Detik untuk Mencegah Race Condition
    // Memastikan counter nomor surat tidak akan pernah duplikat
    var hasLock = lock.tryLock(30000);
    if (!hasLock) {
      return jsonResponse({
        success: false,
        status: "ERROR",
        message: "Server sedang melayani permohonan lain secara bersamaan. Silakan ulangi dalam beberapa saat."
      });
    }

    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

    // 6. Periksa Tab 'Tanggungan_Buku'
    var debtItems = checkTanggunganBuku(ss, nim);
    if (debtItems.length > 0) {
      lock.releaseLock();
      return jsonResponse({
        success: false,
        status: "HAS_DEBT",
        message: "Mahasiswa masih memiliki tanggungan peminjaman koleksi buku di Kurikuratorium FPMIPA UPI.",
        items: debtItems
      });
    }

    // 7. Periksa Tab 'Log_Surat' (Batasan 1x Penerbitan)
    var previousIssuance = checkPreviousIssuance(ss, nim, email);
    if (previousIssuance && !isUrgent) {
      lock.releaseLock();
      return jsonResponse({
        success: false,
        status: "REQUIRES_URGENCY",
        message: "Surat Keterangan Bebas Pinjam Pustaka atas NIM ini sudah pernah diterbitkan.",
        existingNomor: previousIssuance.nomorSurat,
        existingDate: previousIssuance.tanggalFormat
      });
    }

    // 8. Dapatkan Nomor Surat Berurutan dari Tab 'Counter_Surat'
    var currentYear = new Date().getFullYear();
    var nomorUrut = getNextCounterNumber(ss, currentYear);
    
    // Format nomor dengan leading zero 4 digit, misal: T-0042/UN40.A4.8/TA.01.06/2026
    var nomorAutoStr = padZero(nomorUrut, 4);
    var nomorSuratLengkap = CONFIG.KODE_SURAT_PREFIX + nomorAutoStr + CONFIG.KODE_SURAT_SUFFIX + currentYear;

    // 9. Generate Tanggal Format Indonesia & Masa Berlaku
    var now = new Date();
    var tanggalSuratFormat = formatTanggalIndonesia(now);
    var masaBerlaku = "6 (Enam) Bulan Sejak Tanggal Terbit";

    // 10. Generate URL Verifikasi Online untuk QR Code
    var scriptServiceUrl = ScriptApp.getService().getUrl();
    var verificationUrl = scriptServiceUrl + "?verify=" + encodeURIComponent(nomorSuratLengkap);

    // 11. Hasilkan Dokumen PDF Menggunakan Template Google Docs
    var pdfResult = generatePdfDocument({
      nomorSurat: nomorSuratLengkap,
      tanggalSurat: tanggalSuratFormat,
      nama: nama,
      nim: nim,
      prodi: prodi,
      fakultas: "Fakultas Pendidikan Matematika dan Ilmu Pengetahuan Alam",
      tahun: currentYear.toString(),
      masaBerlaku: masaBerlaku,
      verificationUrl: verificationUrl
    });

    // 12. Catat Transaksi Penerbitan ke Tab 'Log_Surat'
    logSuratIssuance(ss, {
      timestamp: now,
      nomorSurat: nomorSuratLengkap,
      nim: nim,
      nama: nama,
      email: email,
      prodi: prodi,
      isUrgent: isUrgent ? "YA" : "TIDAK",
      alasanUrgensi: alasanUrgensi || "-",
      fileId: pdfResult.fileId,
      pdfUrl: pdfResult.previewUrl,
      verificationUrl: verificationUrl
    });

    // Lepas Kunci Transaksi
    lock.releaseLock();

    // 13. Kembalikan Response Sukses ke Frontend
    return jsonResponse({
      success: true,
      status: "SUCCESS",
      nomorSurat: nomorSuratLengkap,
      tanggalSurat: tanggalSuratFormat,
      masaBerlaku: masaBerlaku,
      downloadUrl: pdfResult.downloadUrl,
      previewUrl: pdfResult.previewUrl,
      verificationUrl: verificationUrl
    });

  } catch (err) {
    if (lock.hasLock()) {
      lock.releaseLock();
    }

    return jsonResponse({
      success: false,
      status: "ERROR",
      message: "Terjadi kesalahan internal server: " + err.toString()
    });
  }
}

// ============================================================================
// HELPER: PENGECEKAN TAB TANGGUNGAN_BUKU
// ============================================================================
function checkTanggunganBuku(spreadsheet, nim) {
  var sheet = spreadsheet.getSheetByName(CONFIG.SHEET_TANGGUNGAN);
  if (!sheet) {
    throw new Error("Tab '" + CONFIG.SHEET_TANGGUNGAN + "' tidak ditemukan pada Spreadsheet Database.");
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Hanya baris header

  // Header Asumsi: [0] NIM, [1] Nama, [2] Judul_Buku, [3] Barcode_Buku, [4] Tanggal_Pinjam, [5] Denda, [6] Status
  var results = [];
  var targetNim = nim.toUpperCase().trim();

  for (var i = 1; i < data.length; i++) {
    var rowNim = String(data[i][0]).toUpperCase().trim();
    var status = String(data[i][6]).toUpperCase().trim();

    if (rowNim === targetNim) {
      // Jika status belum selesai/kembali
      if (status !== "SELESAI" && status !== "KEMBALI" && status !== "LUNAS") {
        var tglPinjamRaw = data[i][4];
        var tglPinjamStr = tglPinjamRaw instanceof Date 
          ? Utilities.formatDate(tglPinjamRaw, "GMT+7", "dd/MM/yyyy") 
          : String(tglPinjamRaw);

        results.push({
          judul: String(data[i][2] || "Buku Koleksi Kurikuratorium"),
          barcode: String(data[i][3] || "-"),
          tglPinjam: tglPinjamStr,
          denda: data[i][5] ? Number(data[i][5]) : 0,
          status: status || "Dipinjam"
        });
      }
    }
  }

  return results;
}

// ============================================================================
// HELPER: PENGECEKAN RIWAYAT TAB LOG_SURAT
// ============================================================================
function checkPreviousIssuance(spreadsheet, nim, email) {
  var sheet = spreadsheet.getSheetByName(CONFIG.SHEET_LOG);
  if (!sheet) {
    throw new Error("Tab '" + CONFIG.SHEET_LOG + "' tidak ditemukan pada Spreadsheet Database.");
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return null;

  // Header Asumsi: [0] Timestamp, [1] Nomor_Surat, [2] NIM, [3] Nama, [4] Email, ...
  var targetNim = nim.toUpperCase().trim();
  var targetEmail = email.toLowerCase().trim();

  for (var i = data.length - 1; i >= 1; i--) {
    var rowNim = String(data[i][2]).toUpperCase().trim();
    var rowEmail = String(data[i][4]).toLowerCase().trim();

    if (rowNim === targetNim || rowEmail === targetEmail) {
      var tglRaw = data[i][0];
      var tglStr = tglRaw instanceof Date
        ? formatTanggalIndonesia(tglRaw)
        : String(tglRaw);

      return {
        nomorSurat: String(data[i][1]),
        tanggalFormat: tglStr
      };
    }
  }

  return null;
}

// ============================================================================
// HELPER: ATOMIC COUNTER NOMOR SURAT (TAB COUNTER_SURAT)
// ============================================================================
function getNextCounterNumber(spreadsheet, year) {
  var sheet = spreadsheet.getSheetByName(CONFIG.SHEET_COUNTER);
  if (!sheet) {
    throw new Error("Tab '" + CONFIG.SHEET_COUNTER + "' tidak ditemukan pada Spreadsheet Database.");
  }

  var data = sheet.getDataRange().getValues();
  var targetYear = Number(year);
  var rowIndex = -1;
  var currentCounter = 0;

  // Cari baris tahun aktif
  for (var i = 1; i < data.length; i++) {
    if (Number(data[i][0]) === targetYear) {
      rowIndex = i + 1; // 1-indexed untuk getRange
      currentCounter = Number(data[i][1]) || 0;
      break;
    }
  }

  var newCounter = currentCounter + 1;

  if (rowIndex > 0) {
    // Update counter yang ada
    sheet.getRange(rowIndex, 2).setValue(newCounter);
  } else {
    // Tambahkan baris baru untuk tahun ini
    sheet.appendRow([targetYear, newCounter]);
  }

  SpreadsheetApp.flush();
  return newCounter;
}

// ============================================================================
// HELPER: GENERATOR DOKUMEN PDF BERBASIS TEMPLATE GOOGLE DOCS + DYNAMIC QR CODE
// ============================================================================
function generatePdfDocument(params) {
  var templateFile = DriveApp.getFileById(CONFIG.TEMPLATE_DOC_ID);
  var outputFolder = DriveApp.getFolderById(CONFIG.OUTPUT_FOLDER_ID);

  var cleanNomor = params.nomorSurat.replace(/[\/\\:]/g, "_");
  var copyTitle = "TEMP_Surat_Bebas_Pustaka_" + params.nim + "_" + cleanNomor;
  
  // 1. Gandakan Google Doc Template
  var copyFile = templateFile.makeCopy(copyTitle, outputFolder);
  var copyId = copyFile.getId();

  // 2. Buka dan Ganti Placeholder Teks
  var doc = DocumentApp.openById(copyId);
  var body = doc.getBody();

  body.replaceText("\\{\\{NOMOR_SURAT\\}\\}", params.nomorSurat);
  body.replaceText("\\{\\{TANGGAL_SURAT\\}\\}", params.tanggalSurat);
  body.replaceText("\\{\\{NAMA\\}\\}", params.nama);
  body.replaceText("\\{\\{NIM\\}\\}", params.nim);
  body.replaceText("\\{\\{PRODI\\}\\}", params.prodi);
  body.replaceText("\\{\\{FAKULTAS\\}\\}", params.fakultas);
  body.replaceText("\\{\\{TAHUN\\}\\}", params.tahun);
  body.replaceText("\\{\\{MASA_BERLAKU\\}\\}", params.masaBerlaku);
  body.replaceText("\\{\\{VERIFICATION_URL\\}\\}", params.verificationUrl);

  // Kalimat Resmi Legalitas Dokumen Elektronik
  var legalitasText = 
    "Dokumen ini sah dan diterbitkan secara elektronik oleh Sistem Otomasi Kurikuratorium FPMIPA " +
    "Universitas Pendidikan Indonesia tanpa tanda tangan basah dan stempel fisik. " +
    "Keabsahan dokumen dapat diverifikasi secara langsung dengan memindai Dynamic QR Code di atas.";
  body.replaceText("\\{\\{LEGALITAS_NOTE\\}\\}", legalitasText);

  // 3. Generate Dynamic QR Code Image & Sisipkan ke Dokumen
  try {
    var qrApiUrl = "https://quickchart.io/qr?text=" + encodeURIComponent(params.verificationUrl) + "&size=240&ecLevel=H&margin=1";
    var qrResponse = UrlFetchApp.fetch(qrApiUrl);
    var qrBlob = qrResponse.getBlob().setName("qrcode_verification.png");

    // Cari placeholder {{QR_CODE}} di dalam dokumen
    var qrPlaceholder = body.findText("\\{\\{QR_CODE\\}\\}");
    if (qrPlaceholder) {
      var textElement = qrPlaceholder.getElement();
      var parent = textElement.getParent();

      // Hapus placeholder teks
      textElement.asText().setText("");

      // Sisipkan gambar QR Code
      var image;
      if (parent.getType() === DocumentApp.ElementType.PARAGRAPH) {
        image = parent.asParagraph().appendInlineImage(qrBlob);
      } else if (parent.getType() === DocumentApp.ElementType.TABLE_CELL) {
        image = parent.asTableCell().appendImage(qrBlob);
      } else {
        image = body.appendImage(qrBlob);
      }

      if (image) {
        image.setWidth(95);
        image.setHeight(95);
      }
    }
  } catch (qrErr) {
    console.warn("Gagal menyisipkan gambar QR Code: " + qrErr.toString());
    body.replaceText("\\{\\{QR_CODE\\}\\}", "[QR Code Verifikasi Elektronik]");
  }

  // 4. Simpan Dokumen
  doc.saveAndClose();

  // 5. Ekspor Dokumen ke Format PDF
  var pdfBlob = copyFile.getAs("application/pdf");
  var finalPdfName = "Surat_Bebas_Pustaka_" + params.nim + "_" + cleanNomor + ".pdf";
  pdfBlob.setName(finalPdfName);

  var pdfFile = outputFolder.createFile(pdfBlob);

  // 6. Hapus Dokumen Kerja Sementara agar Drive Rapi
  copyFile.setTrashed(true);

  // 7. Atur Hak Akses File PDF menjadi ANYONE_WITH_LINK (View Only)
  pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // 8. Tautan Langsung Download & Preview
  var fileId = pdfFile.getId();
  var directDownloadUrl = "https://drive.google.com/uc?export=download&id=" + fileId;
  var previewUrl = pdfFile.getUrl();

  return {
    fileId: fileId,
    downloadUrl: directDownloadUrl,
    previewUrl: previewUrl
  };
}

// ============================================================================
// HELPER: LOG SURAT ISSUANCE (TAB LOG_SURAT)
// ============================================================================
function logSuratIssuance(spreadsheet, data) {
  var sheet = spreadsheet.getSheetByName(CONFIG.SHEET_LOG);
  if (!sheet) {
    throw new Error("Tab '" + CONFIG.SHEET_LOG + "' tidak ditemukan.");
  }

  sheet.appendRow([
    data.timestamp,
    data.nomorSurat,
    data.nim,
    data.nama,
    data.email,
    data.prodi,
    data.isUrgent,
    data.alasanUrgensi,
    data.fileId,
    data.pdfUrl,
    data.verificationUrl
  ]);

  SpreadsheetApp.flush();
}

// ============================================================================
// HELPER: RENDER HALAMAN VERIFIKASI KEABSAHAN ELEKTRONIK (HTML OUTPUT)
// ============================================================================
function renderVerificationPage(nomorSuratQuery) {
  var cleanQuery = (nomorSuratQuery || "").trim();
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_LOG);

  var record = null;

  if (sheet) {
    var data = sheet.getDataRange().getValues();
    for (var i = data.length - 1; i >= 1; i--) {
      var rowNomor = String(data[i][1]).trim();
      if (rowNomor.toUpperCase() === cleanQuery.toUpperCase()) {
        record = {
          nomorSurat: rowNomor,
          nim: data[i][2],
          nama: data[i][3],
          email: data[i][4],
          prodi: data[i][5],
          tanggal: data[i][0] instanceof Date ? formatTanggalIndonesia(data[i][0]) : String(data[i][0]),
          pdfUrl: data[i][9]
        };
        break;
      }
    }
  }

  var isVerified = record !== null;

  var htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verifikasi Keabsahan Surat Bebas Pustaka - FPMIPA UPI</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', system-ui, sans-serif; background-color: #F8FAFC; color: #1E293B; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1.5rem; }
        .card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(15,23,42,0.08); width: 100%; max-width: 580px; overflow: hidden; }
        .card-header { padding: 2rem 2rem 1.5rem 2rem; text-align: center; border-bottom: 1px solid #F1F5F9; }
        .badge-status { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.45rem 1.15rem; border-radius: 9999px; font-weight: 700; font-size: 0.813rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; }
        .badge-verified { background-color: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; }
        .badge-invalid { background-color: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }
        .title { font-size: 1.35rem; font-weight: 800; color: #0F172A; margin-bottom: 0.25rem; }
        .subtitle { font-size: 0.875rem; color: #64748B; }
        .card-body { padding: 1.75rem 2rem; }
        .detail-row { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px dashed #E2E8F0; font-size: 0.875rem; }
        .detail-row:last-child { border-bottom: none; }
        .label { color: #64748B; font-weight: 600; }
        .val { color: #0F172A; font-weight: 700; text-align: right; }
        .val.highlight { color: #2563EB; font-family: monospace; font-size: 0.95rem; }
        .legal-notice { margin-top: 1.5rem; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 1rem; font-size: 0.775rem; color: #475569; line-height: 1.5; }
        .card-footer { padding: 1.25rem 2rem; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center; font-size: 0.75rem; color: #94A3B8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="card-header">
          ${isVerified ? `
            <div class="badge-status badge-verified">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              Dokumen Sah & Terverifikasi
            </div>
            <h1 class="title">Verifikasi Keabsahan Surat</h1>
            <p class="subtitle">Pangkalan Data Otomasi Kurikuratorium FPMIPA UPI</p>
          ` : `
            <div class="badge-status badge-invalid">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Dokumen Tidak Ditemukan
            </div>
            <h1 class="title">Verifikasi Gagal</h1>
            <p class="subtitle">Nomor surat tidak tercatat dalam pangkalan data resmi.</p>
          `}
        </div>

        <div class="card-body">
          ${isVerified ? `
            <div class="detail-row">
              <span class="label">Nomor Surat</span>
              <span class="val highlight">${record.nomorSurat}</span>
            </div>
            <div class="detail-row">
              <span class="label">Nama Mahasiswa</span>
              <span class="val">${record.nama}</span>
            </div>
            <div class="detail-row">
              <span class="label">NIM</span>
              <span class="val">${record.nim}</span>
            </div>
            <div class="detail-row">
              <span class="label">Program Studi</span>
              <span class="val">${record.prodi}</span>
            </div>
            <div class="detail-row">
              <span class="label">Fakultas</span>
              <span class="val">FPMIPA UPI</span>
            </div>
            <div class="detail-row">
              <span class="label">Tanggal Diterbitkan</span>
              <span class="val">${record.tanggal}</span>
            </div>
            <div class="detail-row">
              <span class="label">Status Tanggungan</span>
              <span class="val" style="color:#059669;">BEBAS PINJAM PUSTAKA (CLEAN)</span>
            </div>

            <div class="legal-notice">
              <strong>Pernyataan Hukum:</strong> Surat Keterangan Bebas Pinjam Pustaka dengan nomor di atas adalah dokumen resmi yang diterbitkan secara elektronik melalui sistem otomasi Kurikuratorium FPMIPA UPI. Dokumen ini sah dan memiliki kekuatan pembuktian hukum tanpa memerlukan tanda tangan basah dan stempel fisik.
            </div>
          ` : `
            <p style="font-size:0.875rem; color:#64748B; text-align:center; padding:1.5rem 0;">
              Nomor surat <code>${cleanQuery || '-'}</code> tidak terdaftar dalam log penerbitan resmi. Pastikan kode verifikasi pada QR Code tidak diubah.
            </p>
          `}
        </div>

        <div class="card-footer">
          © 2026 Kurikuratorium FPMIPA - Universitas Pendidikan Indonesia
        </div>
      </div>
    </body>
    </html>
  `;

  return HtmlService.createHtmlOutput(htmlContent)
    .setTitle("Verifikasi Surat Bebas Pustaka - FPMIPA UPI")
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format Angka dengan Leading Zeros (misal: 1 -> "0001")
 */
function padZero(num, size) {
  var s = num + "";
  while (s.length < size) s = "0" + s;
  return s;
}

/**
 * Format Tanggal Indonesia (contoh: "18 September 2026")
 */
function formatTanggalIndonesia(date) {
  var bulanIndo = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  var day = date.getDate();
  var month = bulanIndo[date.getMonth()];
  var year = date.getFullYear();

  return day + " " + month + " " + year;
}

/**
 * Helper Output JSON untuk Response REST API
 */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
