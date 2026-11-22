# Library Clearance Letter Automation (FPMIPA UPI)

A serverless web application that verifies students' outstanding library loans and automatically issues QR-verifiable **Library Clearance Letters (Surat Bebas Pinjam Pustaka)** in PDF format without wet signatures or manual stamping. Built for the **Kurikuratorium FPMIPA, Universitas Pendidikan Indonesia (UPI)** case study using vanilla ES modules, **Google Identity Services (GIS)**, **Google Apps Script**, **Google Sheets**, and **Google Docs**.

> **Public Repo Notice:** All live OAuth Client IDs, Google Apps Script `/exec` URLs, personal phone numbers, and institutional email addresses have been replaced with clean placeholders.

---

## System Workflow

```text
Student Browser (Single-Card 3-Step Wizard)
   |
   |  1. Sign in via Google Identity Services (@upi.edu domain enforced)
   |  2. Submit NIM + FPMIPA study program (text/plain JSON POST, no CORS preflight)
   v
Google Apps Script Backend (google-apps-script/Code.gs)
   |
   |  3. Validate @upi.edu domain & 11 official FPMIPA study programs
   |  4. Check outstanding loans in Google Sheets ('Tanggungan_Buku')
   |     - Active loan found  -> Return HAS_DEBT + itemized book/fine table
   |     - Repeat request     -> Return REQUIRES_URGENCY (requires reason modal)
   |  5. Acquire LockService.getScriptLock() -> increment atomic counter ('Counter_Surat')
   |     -> Format letter ID: T-0001/UN40.A4.8/TA.01.06/2026
   |  6. Clone Google Docs template -> inject metadata & verification QR code -> export PDF
   |  7. Archive PDF in Google Drive & append audit record to 'Log_Surat'
   v
Public QR Verification Portal (doGet?verify=<letter_number>)
   |
   +--> Scanning the PDF's QR code queries 'Log_Surat' in real time to verify authenticity
```

---

## Key Engineering Highlights

| Component | Implementation | Why It Matters |
| :--- | :--- | :--- |
| **Domain-Restricted Auth** | `js/auth.js` + `Code.gs` enforce `@upi.edu` accounts via Google Identity Services (GIS) JWT validation on both client and server. | Prevents unauthorized external requests while eliminating separate password management. |
| **Concurrency-Safe Numbering** | `LockService.getScriptLock()` guards sequential counter reads/writes in `Counter_Surat`. | Eliminates duplicate official letter numbers (`T-XXXX/UN40.A4.8/TA.01.06/YYYY`) under concurrent graduation-week traffic. |
| **Preflight-Free GAS API** | `js/api.js` sends JSON payloads using `Content-Type: text/plain;charset=utf-8`. | Classified as a CORS Simple Request, avoiding `OPTIONS` preflight failures inherent to Google Apps Script Web Apps. |
| **Zero-Wet-Signature Verification** | Each generated PDF embeds a dynamic QR code pointing to `doGet(?verify=...)`, which renders an official verification page from `Log_Surat`. | Allows academic staff to verify letter authenticity in seconds without manual ledger lookups. |
| **1-Click Workspace Provisioning** | `SetupSheets.gs` and `SetupTemplateDoc.gs` programmatically create the 3-tab database schema, formatting, dummy test records, Drive archive folder, and formatted FPMIPA Docs template. | Reproducible setup in minutes instead of manual spreadsheet and document formatting. |

---

## Repository Structure

```text
library-clearance-automation/
├── index.html                           # Single-card 3-step student wizard UI
├── css/
│   ├── style.css                        # Responsive layout, cards, form controls, modals
│   └── animations.css                   # Mount transitions & loading spinner states
├── js/
│   ├── config.js                        # OAuth Client ID, GAS endpoint, 11 FPMIPA programs, helpdesk info
│   ├── auth.js                          # Google Identity Services (GIS) wrapper & @upi.edu check
│   ├── api.js                           # Preflight-free JSON POST client for Apps Script
│   ├── app.js                           # Wizard state machine, debt table, urgency modal
│   └── scroll-effects.js                # Smooth scroll positioning on step transitions
├── google-apps-script/
│   ├── Code.gs                          # Serverless API (doPost) + QR verification portal (doGet)
│   ├── SetupSheets.gs                   # 1-click Google Sheets database & schema initializer
│   └── SetupTemplateDoc.gs              # 1-click Google Docs letterhead template & Drive folder builder
├── .gitignore
├── LICENSE                              # MIT License
└── README.md
```

---

## Setup & Deployment Guide

### 1. Provision Google Workspace Resources (Automated)
1. Create a blank Google Spreadsheet (`sheets.new`), open **Extensions > Apps Script**, paste `google-apps-script/SetupSheets.gs`, and run `setupDatabaseSheets()`. Copy the generated **Spreadsheet ID**.
2. Paste `google-apps-script/SetupTemplateDoc.gs` into Apps Script and run `setupTemplateAndFolder()`. Copy the generated **Template Doc ID** and **Output Folder ID**.

### 2. Deploy the Serverless Backend
1. Paste `google-apps-script/Code.gs` into your Apps Script project.
2. Fill in `SPREADSHEET_ID`, `TEMPLATE_DOC_ID`, and `OUTPUT_FOLDER_ID` in `CONFIG`.
3. Click **Deploy > New deployment > Web app** (`Execute as: Me`, `Who has access: Anyone`) and copy the `/exec` URL.

### 3. Configure & Host the Frontend
1. Create a Google Cloud OAuth 2.0 Web Client ID with your local/production origin in **Authorized JavaScript origins**.
2. Update `GOOGLE_CLIENT_ID` and `GAS_API_URL` in `js/config.js`.
3. Serve locally or deploy the static files directly to **Netlify**, **Vercel**, or **GitHub Pages**:

```bash
npx serve .
```

---

## Author

**Zufar Ahmad Maulidy**
Computer Science Student, Universitas Pendidikan Indonesia (UPI)
GitHub: [@Zeiyth-24](https://github.com/Zeiyth-24) | LinkedIn: [linkedin.com/in/zufarahmad](https://www.linkedin.com/in/zufarahmad/)
