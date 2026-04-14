# 📄 Airtable → Fillable PDF Generator (SFPD Request Forms)

This project generates **fillable PDF forms** from Airtable data.

It:
- pulls record data from Airtable (via automation script)
- fills a PDF template using `pdf-lib`
- dynamically adds additional pages when needed (for >5 locations)
- returns a **still-editable PDF**
- attaches the generated PDF back to the Airtable record

---

## 🚀 Features

- ✅ Fill existing PDF form fields (AcroForm)
- ✅ Keep PDFs **editable (not flattened)**
- ✅ Attach generated PDF back to Airtable
- ✅ Support up to **50+ locations**
- ✅ Automatically add continuation pages
- ✅ Works locally (ngrok) or deployed (Render)

---

## 🧱 Architecture
```
Airtable Automation
↓
Run Script (collect record data)
↓
POST → Node.js API (/generate-pdf)
↓
pdf-lib fills template + adds pages
↓
PDF saved + public URL returned
↓
Airtable attaches PDF to record
```
---

## 📦 Project Structure
```
/airtable-pdf-service
├── airtable_pdf_service.mjs
├── Police_Request_Fillable_Form.pdf
├── package.json
└── output/ (generated PDFs)
```
---

## 🛠️ Setup

### 1. Install dependencies
``` Bash
npm install express pdf-lib
```

### 2. Add your PDF template
Place your fillable PDF in the project root:
`Police_Request_Fillable_Form.pdf`

### 3. Run the server
``` Bash
export SHARED_SECRET=replace-me
export PUBLIC_BASE_URL=https://YOUR-URL/output
node airtable_pdf_service.mjs
```
### 4. (Local only) expose with ngrok
``` Bash
ngrok http 3000
```
---

## 🔌 Airtable Setup
### Required Fields

Create these fields in your Airtable table:

### General
```
CONTRACTOR / PRODUCTION COMPANY NAME
PRODUCTION TITLE
BILLING NAME
BILLING EMAIL
BILLING PHONE
BILLING  ADDRESS / CITY / STATE / ZIPCODE
```
### Location Fields (repeat pattern up to 50)

For each location `N`:
```
SFPD DATE N
SFPD START TIME N
SFPD END TIME N
NUMBER OF OFFICERS N
On Location Contact N
LOCATION TO REPORT N
SFPD Activity N
```
Example:
```
SFPD DATE 1
SFPD DATE 2
...
SFPD DATE 50
```
### Helper Fields
```
Generated PDF           (Attachment)
Generated PDF URL       (URL)
PDF Status              (Text)
Generate PDF            (Checkbox trigger)
PDF Debug               (Long text, optional)
```
---

## ⚙️ Airtable Automation Script

Use a "Run a script" action.

### Inputs
```
recordId        → from trigger
pdfServiceUrl   → https://your-url/generate-pdf
apiKey          → replace-me
```
### Script
``` JavaScript
const { recordId, pdfServiceUrl, apiKey } = input.config();

const TABLE_NAME = 'Requests';
const ATTACHMENT_FIELD = 'Generated PDF';
const URL_FIELD = 'Generated PDF URL';
const STATUS_FIELD = 'PDF Status';

const PDF_FIELDS = [];

// Generate fields 1–50 dynamically
for (let i = 1; i <= 50; i++) {
  PDF_FIELDS.push(
    `SFPD DATE ${i}`,
    `SFPD START TIME ${i}`,
    `SFPD END TIME ${i}`,
    `NUMBER OF OFFICERS ${i}`,
    `On Location Contact ${i}`,
    `LOCATION TO REPORT ${i}`,
    `SFPD Activity ${i}`
  );
}

// Add general fields
PDF_FIELDS.push(
  'CONTRACTOR / PRODUCTION COMPANY NAME',
  'PRODUCTION TITLE',
  'BILLING NAME',
  'BILLING EMAIL',
  'BILLING PHONE',
  'BILLING  ADDRESS / CITY / STATE / ZIPCODE'
);

const table = base.getTable(TABLE_NAME);

const query = await table.selectRecordsAsync({
  fields: PDF_FIELDS,
});

const record = query.getRecord(recordId);

const data = {};
for (const field of PDF_FIELDS) {
  data[field] = record.getCellValue(field);
}

const response = await fetch(pdfServiceUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({ recordId, data }),
});

const result = await response.json();

await table.updateRecordAsync(recordId, {
  [ATTACHMENT_FIELD]: [
    {
      url: result.pdfUrl,
      filename: result.filename,
    },
  ],
  [URL_FIELD]: result.pdfUrl,
  [STATUS_FIELD]: 'Generated',
});
```
---

## 📄 Dynamic Page Generation
### Template Capacity
- Page 1 → Locations 1–2
- Page 2 → Locations 3–5
- Total built-in capacity = 5 locations

---

## Overflow Logic

### For locations >5:
- Each extra page supports 3 locations
- New pages are generated dynamically
- Fields are created programmatically (not copied)

Example:

| Locations | Pages |
| --------- | ----- |
| 5         | 2     |
| 8         | 3     |
| 11        | 4     |

### Why not duplicate pages?

PDF forms use a global field namespace, so duplicating pages causes:
- field collisions
- overwritten values

Instead, we:
- embed the layout as a background
- create new uniquely named fields

---

## ⚠️ Known Gotchas
### 1. Airtable caching

Always generate unique filenames:
``` JavaScript
const filename = `filled-${recordId}-${Date.now()}.pdf`;
```
### 2. Field alignment

Coordinates may need tuning:
``` JavaScript
x, y, width, height
```
Use temporary borders to debug:
``` JavaScript
borderWidth: 1
```
### 3. PDF must be AcroForm
- Works with standard fillable PDFs
- XFA forms may need form.deleteXFA()

---

## 🚀 Deployment

Recommended: Render

Steps:
1. Push repo to GitHub
2. Create Web Service
3. Set env vars:
```
SHARED_SECRET=replace-me
PUBLIC_BASE_URL=https://your-app.onrender.com/output
```
---

## 🧠 Future Improvements
- Replace 50 columns with array-based Airtable structure
- Add field auto-alignment tool
- Upload PDF directly to Airtable via API
- Support multiple templates

## 📌 Summary

This system turns Airtable into a PDF generation engine with:
- dynamic layout
- editable outputs
- scalable page handling
