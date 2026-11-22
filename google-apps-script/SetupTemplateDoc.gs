/**
 * ============================================================================
 * SCRIPT OTOMASI SETUP TEMPLATE GOOGLE DOCS & FOLDER GOOGLE DRIVE
 * SISTEM SURAT BEBAS PINJAM PUSTAKA - KURIKURATORIUM FPMIPA UPI
 * ============================================================================
 * 
 * Script ini mengotomatiskan Tahap 3 (3.A & 3.B) pada README.md:
 * 1. Membuat Folder Arsip PDF di Google Drive: 'Arsip_Surat_Bebas_Pustaka_FPMIPA'
 * 2. Membuat Google Docs Resmi: 'Template_Surat_Bebas_Pustaka_FPMIPA'
 * 3. Memformat KOP Resmi FPMIPA UPI, garis ganda, tipografi, paragraf,
 *    tabel biodata borderless (agar titik dua sejajar rapi),
 *    serta seluruh placeholder dinamis:
 *    - {{NOMOR_SURAT}}
 *    - {{NAMA}}
 *    - {{NIM}}
 *    - {{PRODI}}
 *    - {{FAKULTAS}}
 *    - {{MASA_BERLAKU}}
 *    - {{TANGGAL_SURAT}}
 *    - {{QR_CODE}}
 *    - {{LEGALITAS_NOTE}}
 *    - {{VERIFICATION_URL}}
 * 4. Menghasilkan ID Folder & ID Template yang siap disalin ke Code.gs dan config.js.
 * 
 * CARA PENGGUNAAN:
 * 1. Buka editor Google Apps Script di Spreadsheet Anda (Extensions > Apps Script).
 * 2. Tambahkan berkas script baru: Klik tombol (+) di samping "Files" > Script > beri nama "SetupTemplateDoc".
 * 3. Salin seluruh isi script ini dan simpan (Ctrl+S / Cmd+S).
 * 4. Pilih fungsi "setupGoogleDocsTemplate" dari menu dropdown fungsi di bagian atas.
 * 5. Klik "Run" (Jalankan).
 * 6. Selesai! Buka tab Execution Log untuk melihat Folder ID dan Template Doc ID Anda.
 */

function setupGoogleDocsTemplate() {
  var FOLDER_NAME = "Arsip_Surat_Bebas_Pustaka_FPMIPA";
  var DOC_NAME = "Template_Surat_Bebas_Pustaka_FPMIPA";
  var FONT_FAMILY = "Arial";

  // ==========================================================================
  // 1. BUAT / DAPATKAN FOLDER ARSIP DRIVE (Tahap 3.A)
  // ==========================================================================
  var folderIter = DriveApp.getFoldersByName(FOLDER_NAME);
  var targetFolder;
  if (folderIter.hasNext()) {
    targetFolder = folderIter.next();
    Logger.log("📁 Menggunakan Folder Arsip yang sudah ada: " + targetFolder.getName());
  } else {
    targetFolder = DriveApp.createFolder(FOLDER_NAME);
    Logger.log("📁 Berhasil membuat Folder Arsip baru: " + targetFolder.getName());
  }
  var folderId = targetFolder.getId();

  // ==========================================================================
  // 2. BUAT DOKUMEN GOOGLE DOCS BARU (Tahap 3.B)
  // ==========================================================================
  var doc = DocumentApp.create(DOC_NAME);
  var docId = doc.getId();
  var docFile = DriveApp.getFileById(docId);

  // Pindahkan template ke folder arsip agar tertata rapi
  targetFolder.addFile(docFile);
  DriveApp.getRootFolder().removeFile(docFile);

  var body = doc.getBody();
  body.clear();

  // Konfigurasi Margin Halaman Dokumen Resmi A4 (Satuan Points: 1 inci = 72 pt)
  body.setPageWidth(595.28);  // Standar Lebar A4
  body.setPageHeight(841.89); // Standar Tinggi A4
  body.setMarginTop(36);      // Margin atas 0.5 inci (~1.27 cm)
  body.setMarginBottom(36);   // Margin bawah 0.5 inci
  body.setMarginLeft(54);     // Margin kiri 0.75 inci (~1.9 cm)
  body.setMarginRight(54);    // Margin kanan 0.75 inci

  // ==========================================================================
  // 3. SUSUN KOP SURAT RESMI UPI & FPMIPA
  // ==========================================================================
  var pKop1 = body.appendParagraph("KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI");
  pKop1.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
       .setFontFamily(FONT_FAMILY).setFontSize(10).setBold(true)
       .setSpacingBefore(0).setSpacingAfter(1);

  var pKop2 = body.appendParagraph("UNIVERSITAS PENDIDIKAN INDONESIA");
  pKop2.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
       .setFontFamily(FONT_FAMILY).setFontSize(12).setBold(true)
       .setSpacingBefore(0).setSpacingAfter(1);

  var pKop3 = body.appendParagraph("FAKULTAS PENDIDIKAN MATEMATIKA DAN ILMU PENGETAHUAN ALAM");
  pKop3.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
       .setFontFamily(FONT_FAMILY).setFontSize(12).setBold(true)
       .setSpacingBefore(0).setSpacingAfter(1);

  var pKop4 = body.appendParagraph("KURIKURATORIUM");
  pKop4.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
       .setFontFamily(FONT_FAMILY).setFontSize(11).setBold(true)
       .setSpacingBefore(0).setSpacingAfter(2);

  var pKop5 = body.appendParagraph("Jl. Dr. Setiabudi No. 229 Bandung 40154 Telp. (022) 2001108");
  pKop5.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
       .setFontFamily(FONT_FAMILY).setFontSize(9).setItalic(true)
       .setSpacingBefore(0).setSpacingAfter(6);

  // Garis Pembatas KOP Surat
  body.appendHorizontalRule();

  // Spasi Pemisah Antara KOP dan Judul
  var pSpacer1 = body.appendParagraph("");
  pSpacer1.setFontSize(6).setSpacingBefore(0).setSpacingAfter(4);

  // ==========================================================================
  // 4. JUDUL & NOMOR SURAT
  // ==========================================================================
  var pTitle = body.appendParagraph("SURAT KETERANGAN BEBAS PINJAM PUSTAKA");
  pTitle.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
        .setFontFamily(FONT_FAMILY).setFontSize(12).setBold(true).setUnderline(true)
        .setSpacingBefore(2).setSpacingAfter(2);

  var pNomor = body.appendParagraph("Nomor: {{NOMOR_SURAT}}");
  pNomor.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
        .setFontFamily(FONT_FAMILY).setFontSize(10.5).setBold(false)
        .setSpacingBefore(0).setSpacingAfter(14);

  // ==========================================================================
  // 5. PARAGRAF PENGANTAR
  // ==========================================================================
  var pIntro = body.appendParagraph(
    "Ketua Kurikuratorium Fakultas Pendidikan Matematika dan Ilmu Pengetahuan Alam " +
    "Universitas Pendidikan Indonesia dengan ini menerangkan bahwa:"
  );
  pIntro.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY)
        .setFontFamily(FONT_FAMILY).setFontSize(10.5).setLineSpacing(1.15)
        .setSpacingBefore(0).setSpacingAfter(8);

  // ==========================================================================
  // 6. TABEL BIODATA MAHASISWA (BORDERLESS UNTUK KELURUSAN TITIK DUA)
  // ==========================================================================
  var biodataTableData = [
    ["Nama Lengkap", ":", "{{NAMA}}"],
    ["NIM", ":", "{{NIM}}"],
    ["Program Studi", ":", "{{PRODI}}"],
    ["Fakultas", ":", "{{FAKULTAS}}"]
  ];

  var tableBiodata = body.appendTable(biodataTableData);
  tableBiodata.setBorderWidth(0); // Hilangkan border agar tampak seperti teks biasa yang rapi

  for (var r = 0; r < biodataTableData.length; r++) {
    var row = tableBiodata.getRow(r);
    var cellLabel = row.getCell(0).setWidth(130);
    var cellColon = row.getCell(1).setWidth(15);
    var cellValue = row.getCell(2).setWidth(340);

    cellLabel.getChild(0).asParagraph()
             .setFontFamily(FONT_FAMILY).setFontSize(10.5)
             .setSpacingBefore(2).setSpacingAfter(2);

    cellColon.getChild(0).asParagraph()
             .setFontFamily(FONT_FAMILY).setFontSize(10.5)
             .setSpacingBefore(2).setSpacingAfter(2);

    cellValue.getChild(0).asParagraph()
             .setFontFamily(FONT_FAMILY).setFontSize(10.5).setBold(true)
             .setSpacingBefore(2).setSpacingAfter(2);
  }

  // ==========================================================================
  // 7. PERNYATAAN BEBAS TANGGUNGAN & KEPERLUAN
  // ==========================================================================
  var pPernyataan = body.appendParagraph(
    "Telah menyelesaikan seluruh administrasi dan dinyatakan BEBAS PINJAM PUSTAKA " +
    "serta TIDAK MEMILIKI TANGGUNGAN koleksi buku atau denda pada Kurikuratorium " +
    "FPMIPA Universitas Pendidikan Indonesia."
  );
  pPernyataan.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY)
             .setFontFamily(FONT_FAMILY).setFontSize(10.5).setLineSpacing(1.15)
             .setSpacingBefore(10).setSpacingAfter(8);

  var pKeperluan = body.appendParagraph(
    "Surat keterangan ini diterbitkan secara resmi untuk memenuhi persyaratan Sidang " +
    "Skripsi / Tesis / Disertasi / Pengambilan Ijazah dan Wisuda."
  );
  pKeperluan.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY)
            .setFontFamily(FONT_FAMILY).setFontSize(10.5).setLineSpacing(1.15)
            .setSpacingBefore(0).setSpacingAfter(14);

  // ==========================================================================
  // 8. TANGGAL, MASA BERLAKU, & VERIFIKASI ELEKTRONIK (DYNAMIC QR CODE)
  // ==========================================================================
  // Gunakan tabel 2 kolom borderless agar tanda tangan berada di sisi kanan
  var ttdTable = body.appendTable([
    ["", ""]
  ]);
  ttdTable.setBorderWidth(0);

  var ttdRow = ttdTable.getRow(0);
  var cellLeft = ttdRow.getCell(0).setWidth(245);
  var cellRight = ttdRow.getCell(1).setWidth(240);

  // Bagian Kiri: Masa Berlaku Dokumen
  cellLeft.getChild(0).asParagraph()
          .setText("Masa Berlaku Dokumen: {{MASA_BERLAKU}}")
          .setFontFamily(FONT_FAMILY).setFontSize(9.5).setItalic(true)
          .setSpacingBefore(0).setSpacingAfter(0);

  // Bagian Kanan: Tanggal Terbit, Lembaga, dan Placeholder Dynamic QR Code
  cellRight.clear();
  var pTgl = cellRight.appendParagraph("Diterbitkan di Bandung,\npada tanggal {{TANGGAL_SURAT}}");
  pTgl.setFontFamily(FONT_FAMILY).setFontSize(10).setSpacingBefore(0).setSpacingAfter(6);

  var pLembaga = cellRight.appendParagraph("Kurikuratorium FPMIPA UPI\nVerifikasi Elektronik:");
  pLembaga.setFontFamily(FONT_FAMILY).setFontSize(10).setBold(true).setSpacingBefore(0).setSpacingAfter(4);

  var pQrPlaceholder = cellRight.appendParagraph("{{QR_CODE}}");
  pQrPlaceholder.setFontFamily(FONT_FAMILY).setFontSize(10).setSpacingBefore(0).setSpacingAfter(0);

  // ==========================================================================
  // 9. FOOTER & LEGALITAS DOKUMEN ELEKTRONIK
  // ==========================================================================
  body.appendHorizontalRule();

  var pFootTitle = body.appendParagraph("LEGALITAS DOKUMEN ELEKTRONIK:");
  pFootTitle.setFontFamily(FONT_FAMILY).setFontSize(8).setBold(true)
            .setSpacingBefore(2).setSpacingAfter(1);

  var pFootNote = body.appendParagraph("{{LEGALITAS_NOTE}}");
  pFootNote.setFontFamily(FONT_FAMILY).setFontSize(8).setLineSpacing(1.1)
           .setSpacingBefore(0).setSpacingAfter(2);

  var pFootLink = body.appendParagraph("Tautan Verifikasi: {{VERIFICATION_URL}}");
  pFootLink.setFontFamily(FONT_FAMILY).setFontSize(8).setItalic(true)
           .setSpacingBefore(0).setSpacingAfter(0);

  // Simpan perubahan dokumen
  doc.saveAndClose();

  // ==========================================================================
  // 10. OUTPUT LOG & NOTIFIKASI
  // ==========================================================================
  var infoMessage = 
    "✅ TEMPLATE GOOGLE DOCS & FOLDER SELESAI DIBUAT!\n\n" +
    "📋 TEMPLATE DOC ID  : " + docId + "\n" +
    "📁 OUTPUT FOLDER ID : " + folderId + "\n\n" +
    "🔗 Tautan Google Docs   : " + doc.getUrl() + "\n" +
    "🔗 Tautan Folder Drive  : " + targetFolder.getUrl() + "\n\n" +
    "Silakan salin kedua ID di atas ke berkas Code.gs:";

  var configCodeSnippet =
    "  TEMPLATE_DOC_ID: \"" + docId + "\",\n" +
    "  OUTPUT_FOLDER_ID: \"" + folderId + "\",";

  Logger.log("==================================================================");
  Logger.log(infoMessage);
  Logger.log("Kutipan konfigurasi untuk Code.gs:\n" + configCodeSnippet);
  Logger.log("==================================================================");

  var ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) {}
  if (ui) {
    ui.alert("Setup Template Berhasil! 🎉", infoMessage + "\n\n" + configCodeSnippet, ui.ButtonSet.OK);
  }

  return {
    templateDocId: docId,
    outputFolderId: folderId,
    docUrl: doc.getUrl(),
    folderUrl: targetFolder.getUrl()
  };
}

/**
 * ============================================================================
 * FUNGSI MASTER: SETUP SEMUA INFRASTRUKTUR (1-KLIK TOTAL)
 * ============================================================================
 * Menjalankan pembuatan Tab Spreadsheet, Folder Drive, dan Template Google Docs
 * sekaligus dalam satu kali jalan!
 */
function setupAllSystemResources() {
  Logger.log("🚀 Memulai proses Setup Menyeluruh Sistem Bebas Pustaka...");
  
  // 1. Setup Database Spreadsheet (Tab Tanggungan_Buku, Log_Surat, Counter_Surat)
  if (typeof setupDatabaseSheets === "function") {
    setupDatabaseSheets();
  }

  // 2. Setup Template Google Docs & Folder Arsip
  var docResult = setupGoogleDocsTemplate();

  Logger.log("🎉 SEMUA SUMBER DAYA GOOGLE WORKSPACE BERHASIL DISIAPKAN!");
  Logger.log("Gunakan ID berikut pada CONFIG di Code.gs:");
  Logger.log("TEMPLATE_DOC_ID: \"" + docResult.templateDocId + "\"");
  Logger.log("OUTPUT_FOLDER_ID: \"" + docResult.outputFolderId + "\"");
}
