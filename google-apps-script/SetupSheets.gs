/**
 * ============================================================================
 * SCRIPT OTOMASI SETUP SPREADSHEET DATABASE
 * SISTEM SURAT BEBAS PINJAM PUSTAKA - KURIKURATORIUM FPMIPA UPI
 * ============================================================================
 * 
 * Script ini mengotomatiskan seluruh pembuatan tabel dan tab database sesuai
 * spesifikasi Bab 2 Setup Google Sheets di README.md dalam 1 kali klik.
 * 
 * FITUR YANG DIOTOMATISASI:
 * 1. Membuat 3 Tab Resmi: 'Tanggungan_Buku', 'Log_Surat', dan 'Counter_Surat'.
 * 2. Mengisi seluruh Header kolom dengan format persis sesuai backend Code.gs.
 * 3. Styling profesional: Header Navy FPMIPA (#1B365D), teks putih tebal,
 *    freeze header row (baris 1 beku), dan auto-fit lebar kolom.
 * 4. Format data: NIM diformat sebagai Plain Text (@) agar angka 0 tidak terpotong,
 *    Denda dengan format angka/mata uang, dan Tanggal format dd/MM/yyyy.
 * 5. Mengisi data dummy pengujian (Ahmad Fadillah & Siti Nurhaliza).
 * 6. Mengisi inisialisasi counter nomor surat per tahun (2026 -> 0).
 * 7. Menghapus tab default 'Sheet1' secara otomatis.
 * 8. Menampilkan popup pesan berisi Spreadsheet ID yang siap disalin!
 * 
 * CARA PENGGUNAAN:
 * 1. Buat Google Spreadsheet baru di Google Drive (https://sheets.new).
 * 2. Beri nama file: DB_Kurikuratorium_FPMIPA
 * 3. Klik menu: Extensions (Ekstensi) > Apps Script.
 * 4. Hapus fungsi bawaan (myFunction), lalu paste seluruh script ini.
 * 5. Klik icon Save (Ctrl+S / Cmd+S), pastikan fungsi terpilih "setupDatabaseSheets".
 * 6. Klik tombol "Run" (Jalankan) dan izinkan otorisasi Google Workspace Anda.
 * 7. Selesai! Spreadsheet siap digunakan 100%.
 */

function setupDatabaseSheets() {
  var ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    ss = null;
  }

  // Jika tidak dijalankan dari spreadsheet yang terikat, buatkan otomatis
  if (!ss) {
    ss = SpreadsheetApp.create("DB_Kurikuratorium_FPMIPA");
    Logger.log("✅ Berhasil membuat Spreadsheet baru: " + ss.getUrl());
    Logger.log("📋 SPREADSHEET ID: " + ss.getId());
  }

  var ui = null;
  try {
    ui = SpreadsheetApp.getUi();
  } catch (e) {
    ui = null;
  }

  // Desain Styling Identitas FPMIPA UPI
  var HEADER_BG = "#1B365D"; // Navy UPI
  var HEADER_TEXT = "#FFFFFF"; // Putih
  var FONT_FAMILY = "Arial";

  // ==========================================================================
  // 1. TAB: Tanggungan_Buku
  // ==========================================================================
  var sheetTanggungan = ss.getSheetByName("Tanggungan_Buku");
  if (!sheetTanggungan) {
    sheetTanggungan = ss.insertSheet("Tanggungan_Buku");
  } else {
    sheetTanggungan.clear();
  }

  var tanggunganHeaders = [
    ["NIM", "Nama", "Judul_Buku", "Barcode_Buku", "Tanggal_Pinjam", "Denda", "Status"]
  ];
  sheetTanggungan.getRange(1, 1, 1, 7).setValues(tanggunganHeaders);

  // Format Header
  var hRange1 = sheetTanggungan.getRange(1, 1, 1, 7);
  hRange1.setBackground(HEADER_BG)
         .setFontColor(HEADER_TEXT)
         .setFontWeight("bold")
         .setHorizontalAlignment("center")
         .setVerticalAlignment("middle")
         .setFontFamily(FONT_FAMILY);
  sheetTanggungan.setRowHeight(1, 36);
  sheetTanggungan.setFrozenRows(1);

  // Data Dummy Pengujian (Sesuai README Bagian 2.A)
  var tanggunganData = [
    ["2101234", "Ahmad Fadillah", "Fisika Dasar Halliday Resnick Ed. 10", "FPM-2023-0891", "10/08/2026", 5000, "Dipinjam"],
    ["2109876", "Siti Nurhaliza", "Aljabar Linear Elementer", "FPM-2022-0145", "01/07/2026", 0, "SELESAI"]
  ];
  sheetTanggungan.getRange(2, 1, tanggunganData.length, 7).setValues(tanggunganData);

  // Format Tipe Data Kolom
  sheetTanggungan.getRange("A2:A1000").setNumberFormat("@"); // NIM sebagai Plain Text
  sheetTanggungan.getRange("D2:D1000").setNumberFormat("@"); // Barcode_Buku
  sheetTanggungan.getRange("E2:E1000").setNumberFormat("dd/MM/yyyy"); // Tanggal
  sheetTanggungan.getRange("F2:F1000").setNumberFormat("#,##0"); // Denda angka rupiah

  // Auto fit kolom
  for (var c1 = 1; c1 <= 7; c1++) {
    sheetTanggungan.autoResizeColumn(c1);
  }

  // ==========================================================================
  // 2. TAB: Log_Surat
  // ==========================================================================
  var sheetLog = ss.getSheetByName("Log_Surat");
  if (!sheetLog) {
    sheetLog = ss.insertSheet("Log_Surat");
  } else {
    sheetLog.clear();
  }

  var logHeaders = [
    [
      "Timestamp",
      "Nomor_Surat",
      "NIM",
      "Nama",
      "Email",
      "Prodi",
      "Urgensi",
      "Alasan_Urgensi",
      "File_ID",
      "PDF_URL",
      "Verification_URL"
    ]
  ];
  sheetLog.getRange(1, 1, 1, 11).setValues(logHeaders);

  // Format Header
  var hRange2 = sheetLog.getRange(1, 1, 1, 11);
  hRange2.setBackground(HEADER_BG)
         .setFontColor(HEADER_TEXT)
         .setFontWeight("bold")
         .setHorizontalAlignment("center")
         .setVerticalAlignment("middle")
         .setFontFamily(FONT_FAMILY);
  sheetLog.setRowHeight(1, 36);
  sheetLog.setFrozenRows(1);

  // Format Tipe Data
  sheetLog.getRange("A2:A2000").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  sheetLog.getRange("C2:C2000").setNumberFormat("@"); // NIM Plain Text

  for (var c2 = 1; c2 <= 11; c2++) {
    sheetLog.autoResizeColumn(c2);
  }

  // ==========================================================================
  // 3. TAB: Counter_Surat
  // ==========================================================================
  var sheetCounter = ss.getSheetByName("Counter_Surat");
  if (!sheetCounter) {
    sheetCounter = ss.insertSheet("Counter_Surat");
  } else {
    sheetCounter.clear();
  }

  var counterHeaders = [
    ["Tahun", "Counter_Terakhir"]
  ];
  sheetCounter.getRange(1, 1, 1, 2).setValues(counterHeaders);

  var hRange3 = sheetCounter.getRange(1, 1, 1, 2);
  hRange3.setBackground(HEADER_BG)
         .setFontColor(HEADER_TEXT)
         .setFontWeight("bold")
         .setHorizontalAlignment("center")
         .setVerticalAlignment("middle")
         .setFontFamily(FONT_FAMILY);
  sheetCounter.setRowHeight(1, 36);
  sheetCounter.setFrozenRows(1);

  // Data Inisialisasi Counter
  var currentYear = new Date().getFullYear();
  var counterRows = [
    [2026, 0]
  ];
  if (currentYear !== 2026) {
    counterRows.push([currentYear, 0]);
  }
  sheetCounter.getRange(2, 1, counterRows.length, 2).setValues(counterRows);

  sheetCounter.getRange("A2:A100").setNumberFormat("0");
  sheetCounter.getRange("B2:B100").setNumberFormat("0");

  sheetCounter.autoResizeColumn(1);
  sheetCounter.autoResizeColumn(2);

  // ==========================================================================
  // 4. Bersihkan Tab Bawaan (Sheet1 / Lembar1)
  // ==========================================================================
  var defaultSheets = ["Sheet1", "Sheet 1", "Lembar1", "Lembar 1"];
  for (var d = 0; d < defaultSheets.length; d++) {
    var defSheet = ss.getSheetByName(defaultSheets[d]);
    if (defSheet && ss.getSheets().length > 1) {
      try {
        ss.deleteSheet(defSheet);
      } catch (err) {
        // Abaikan
      }
    }
  }

  // Posisi Tab Tanggungan_Buku sebagai tab paling depan
  ss.setActiveSheet(sheetTanggungan);
  ss.moveActiveSheet(1);

  var resultMessage = 
    "Database Google Sheets Berhasil Dikonfigurasi!\n\n" +
    "Detail Tab Database:\n" +
    "1. Tanggungan_Buku (7 Kolom + 2 Data Sampel)\n" +
    "2. Log_Surat (11 Kolom Riwayat Penerbitan)\n" +
    "3. Counter_Surat (2 Kolom LockService Atomic Counter)\n\n" +
    "ID SPREADSHEET ANDA:\n" + ss.getId() + "\n\n" +
    "Salin ID di atas dan masukkan ke CONFIG.SPREADSHEET_ID di Code.gs dan js/config.js.";

  Logger.log("=================================================");
  Logger.log(resultMessage);
  Logger.log("🔗 URL: " + ss.getUrl());
  Logger.log("=================================================");

  if (ui) {
    ui.alert("Konfigurasi Database Sukses! 🎉", resultMessage, ui.ButtonSet.OK);
  }
}
