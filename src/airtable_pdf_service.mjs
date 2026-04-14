import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const app = express();
app.use(express.json({ limit: '2mb' }));

const PORT = process.env.PORT || 3000;
const TEMPLATE_PATH =
  process.env.PDF_TEMPLATE_PATH || './templates/Police_Request_Fillable_Form.pdf';
const OUTPUT_DIR = './output';
const SHARED_SECRET = process.env.SHARED_SECRET || null;

await fs.mkdir(OUTPUT_DIR, { recursive: true });

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/generate-pdf', async (req, res) => {
  try {
    if (SHARED_SECRET) {
      const auth = req.headers.authorization || '';
      if (auth !== `Bearer ${SHARED_SECRET}`) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
    }

    const { recordId, data } = req.body || {};

    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Missing data payload',
      });
    }

    const templateBytes = await fs.readFile(TEMPLATE_PATH);

    // Source doc used only for page embedding
    const templateDoc = await PDFDocument.load(templateBytes);

    // Working output doc
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    try {
      form.deleteXFA();
    } catch {}

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const FIELD_MAPPING = {
      'CONTRACTOR / PRODUCTION COMPANY NAME': 'CONTRACTOR / PRODUCTION COMPANY NAME',
      'PRODUCTION TITLE': 'PRODUCTION TITLE',
      'BILLING NAME': 'BILLING NAME',
      'BILLING EMAIL': 'BILLING EMAIL',
      'BILLING PHONE': 'BILLING PHONE',
      'BILLING  ADDRESS / CITY / STATE / ZIPCODE':
        'BILLING  ADDRESS / CITY / STATE / ZIPCODE',

      'SFPD DATE 1': 'SFPD DATE 1',
      'SFPD START TIME 1': 'SFPD START TIME 1',
      'SFPD END TIME 1': 'SFPD END TIME 1',
      'NUMBER OF OFFICERS 1': 'NUMBER OF OFFICERS 1',
      'On Location Contact 1': 'On Location Contact 1',
      'LOCATION TO REPORT 1': 'LOCATION TO REPORT 1',
      'SFPD Activity 1': 'SFPD Activity 1',

      'SFPD DATE 2': 'SFPD DATE 2',
      'SFPD START TIME 2': 'SFPD START TIME 2',
      'SFPD END TIME 2': 'SFPD END TIME 2',
      'NUMBER OF OFFICERS 2': 'NUMBER OF OFFICERS 2',
      'On Location Contact 2': 'On Location Contact 2',
      'LOCATION TO REPORT 2': 'LOCATION TO REPORT 2',
      'SFPD Activity 2': 'SFPD Activity 2',

      'SFPD DATE 3': 'SFPD DATE 3',
      'SFPD START TIME 3': 'SFPD START TIME 3',
      'SFPD END TIME 3': 'SFPD END TIME 3',
      'NUMBER OF OFFICERS 3': 'NUMBER OF OFFICERS 3',
      'On Location Contact 3': 'On Location Contact 3',
      'LOCATION TO REPORT 3': 'LOCATION TO REPORT 3',
      'SFPD Activity 3': 'SFPD Activity 3',

      'SFPD DATE 4': 'SFPD DATE 4',
      'SFPD START TIME 4': 'SFPD START TIME 4',
      'SFPD END TIME 4': 'SFPD END TIME 4',
      'NUMBER OF OFFICERS 4': 'NUMBER OF OFFICERS 4',
      'On Location Contact 4': 'On Location Contact 4',
      'LOCATION TO REPORT 4': 'LOCATION TO REPORT 4',
      'SFPD Activity 4': 'SFPD Activity 4',

      'SFPD DATE 5': 'SFPD DATE 5',
      'SFPD START TIME 5': 'SFPD START TIME 5',
      'SFPD END TIME 5': 'SFPD END TIME 5',
      'NUMBER OF OFFICERS 5': 'NUMBER OF OFFICERS 5',
      'On Location Contact 5': 'On Location Contact 5',
      'LOCATION TO REPORT 5': 'LOCATION TO REPORT 5',
      'SFPD Activity 5': 'SFPD Activity 5',
    };

    const filledFields = [];
    const skippedFields = [];

    for (const [airtableField, pdfField] of Object.entries(FIELD_MAPPING)) {
      const value = data[airtableField];

      if (value === null || value === undefined || value === '') {
        continue;
      }

      try {
        const textField = form.getTextField(pdfField);
        textField.setText(String(value));
        filledFields.push(pdfField);
      } catch {
        skippedFields.push({
          field: pdfField,
          reason: 'Field not found or not a text field',
        });
      }
    }

    const hasOverflow678 = [6, 7, 8].some((i) => {
      return [
        data[`SFPD DATE ${i}`],
        data[`SFPD START TIME ${i}`],
        data[`SFPD END TIME ${i}`],
        data[`NUMBER OF OFFICERS ${i}`],
        data[`On Location Contact ${i}`],
        data[`LOCATION TO REPORT ${i}`],
        data[`SFPD Activity ${i}`],
      ].some((v) => v !== null && v !== undefined && v !== '');
    });

    console.log('Overflow check 6-8:', {
      'SFPD DATE 6': data['SFPD DATE 6'],
      'SFPD DATE 7': data['SFPD DATE 7'],
      'SFPD DATE 8': data['SFPD DATE 8'],
      hasOverflow678,
    });

    if (hasOverflow678) {
      const sourcePage2 = templateDoc.getPage(1);
      const { width, height } = sourcePage2.getSize();

      const embeddedPage = await pdfDoc.embedPage(sourcePage2);
      const continuationPage = pdfDoc.addPage([width, height]);

      continuationPage.drawPage(embeddedPage, {
        x: 0,
        y: 0,
        width,
        height,
      });

      const SLOT_LAYOUTS = [
        {
          date:     { x: 55,  y: 603, width: 110, height: 18 },
          start:    { x: 176, y: 603, width: 85,  height: 18 },
          end:      { x: 272, y: 603, width: 85,  height: 18 },
          officers: { x: 369, y: 592, width: 60,  height: 28 },
          contact:  { x: 55,  y: 548, width: 375, height: 22 },
          report:   { x: 55,  y: 508, width: 375, height: 24 },
          activity: { x: 55,  y: 458, width: 375, height: 38 },
        },
        {
          date:     { x: 55,  y: 389, width: 110, height: 18 },
          start:    { x: 176, y: 389, width: 85,  height: 18 },
          end:      { x: 272, y: 389, width: 85,  height: 18 },
          officers: { x: 369, y: 378, width: 60,  height: 28 },
          contact:  { x: 55,  y: 334, width: 375, height: 22 },
          report:   { x: 55,  y: 294, width: 375, height: 24 },
          activity: { x: 55,  y: 244, width: 375, height: 38 },
        },
        {
          date:     { x: 55,  y: 176, width: 110, height: 18 },
          start:    { x: 176, y: 176, width: 85,  height: 18 },
          end:      { x: 272, y: 176, width: 85,  height: 18 },
          officers: { x: 369, y: 165, width: 60,  height: 28 },
          contact:  { x: 55,  y: 121, width: 375, height: 22 },
          report:   { x: 55,  y: 81,  width: 375, height: 24 },
          activity: { x: 55,  y: 31,  width: 375, height: 38 },
        },
      ];

      for (const index of [6, 7, 8]) {
        const slot = SLOT_LAYOUTS[index - 6];

        const loc = {
          date: data[`SFPD DATE ${index}`] || '',
          start: data[`SFPD START TIME ${index}`] || '',
          end: data[`SFPD END TIME ${index}`] || '',
          officers: data[`NUMBER OF OFFICERS ${index}`] || '',
          contact: data[`On Location Contact ${index}`] || '',
          report: data[`LOCATION TO REPORT ${index}`] || '',
          activity: data[`SFPD Activity ${index}`] || '',
        };

        const hasAnyValue = Object.values(loc).some((v) => String(v).trim() !== '');
        if (!hasAnyValue) continue;

        addTextField(form, continuationPage, `SFPD DATE ${index}`, slot.date, loc.date, font);
        addTextField(form, continuationPage, `SFPD START TIME ${index}`, slot.start, loc.start, font);
        addTextField(form, continuationPage, `SFPD END TIME ${index}`, slot.end, loc.end, font);
        addTextField(form, continuationPage, `NUMBER OF OFFICERS ${index}`, slot.officers, loc.officers, font);
        addTextField(form, continuationPage, `On Location Contact ${index}`, slot.contact, loc.contact, font, true);
        addTextField(form, continuationPage, `LOCATION TO REPORT ${index}`, slot.report, loc.report, font, true);
        addTextField(form, continuationPage, `SFPD Activity ${index}`, slot.activity, loc.activity, font, true);

        filledFields.push(
          `SFPD DATE ${index}`,
          `SFPD START TIME ${index}`,
          `SFPD END TIME ${index}`,
          `NUMBER OF OFFICERS ${index}`,
          `On Location Contact ${index}`,
          `LOCATION TO REPORT ${index}`,
          `SFPD Activity ${index}`
        );
      }
    }

    form.updateFieldAppearances(font);

    console.log('Final page count:', pdfDoc.getPageCount());

    const pdfBytes = await pdfDoc.save();

    const safeRecordId = String(recordId || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = Date.now();
    const filename = `filled-${safeRecordId}-${timestamp}.pdf`;
    const filepath = path.join(OUTPUT_DIR, filename);

    await fs.writeFile(filepath, pdfBytes);

    const baseUrl =
      process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}/output`;

    const pdfUrl = `${baseUrl}/${filename}`;

    return res.json({
      success: true,
      pdfUrl,
      filename,
      filledFields,
      skippedFields,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

function addTextField(form, page, name, rect, value, font, multiline = false) {
  const field = form.createTextField(name);

  if (multiline) {
    try {
      field.enableMultiline();
    } catch {}
  }

  field.setText(String(value || ''));

  field.addToPage(page, {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  });

  try {
    field.updateAppearances(font);
  } catch {}
}

app.use('/output', express.static(path.resolve(OUTPUT_DIR)));

app.listen(PORT, () => {
  console.log(`PDF service running on port ${PORT}`);
});
