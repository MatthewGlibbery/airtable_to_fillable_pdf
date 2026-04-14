const { recordId, pdfServiceUrl, apiKey } = input.config();

if (!recordId) throw new Error('Missing automation input: recordId');
if (!pdfServiceUrl) throw new Error('Missing automation input: pdfServiceUrl');

const TABLE_NAME = 'Requests';
const ATTACHMENT_FIELD = 'Generated PDF';
const URL_FIELD = 'Generated PDF URL';
const STATUS_FIELD = 'PDF Status';
const TRIGGER_FIELD = 'Generate PDF';

const PDF_FIELDS = [
  'CONTRACTOR / PRODUCTION COMPANY NAME',
  'PRODUCTION TITLE',
  'BILLING NAME',
  'BILLING EMAIL',
  'BILLING PHONE',
  'BILLING  ADDRESS / CITY / STATE / ZIPCODE',

  'SFPD DATE 1',
  'SFPD START TIME 1',
  'SFPD END TIME 1',
  'NUMBER OF OFFICERS 1',
  'On Location Contact 1',
  'LOCATION TO REPORT 1',
  'SFPD Activity 1',

  'SFPD DATE 2',
  'SFPD START TIME 2',
  'SFPD END TIME 2',
  'NUMBER OF OFFICERS 2',
  'On Location Contact 2',
  'LOCATION TO REPORT 2',
  'SFPD Activity 2',

    'SFPD DATE 3',
  'SFPD START TIME 3',
  'SFPD END TIME 3',
  'NUMBER OF OFFICERS 3',
  'On Location Contact 3',
  'LOCATION TO REPORT 3',
  'SFPD Activity 3',

  'SFPD DATE 4',
  'SFPD START TIME 4',
  'SFPD END TIME 4',
  'NUMBER OF OFFICERS 4',
  'On Location Contact 4',
  'LOCATION TO REPORT 4',
  'SFPD Activity 4',

  'SFPD DATE 5',
  'SFPD START TIME 5',
  'SFPD END TIME 5',
  'NUMBER OF OFFICERS 5',
  'On Location Contact 5',
  'LOCATION TO REPORT 5',
  'SFPD Activity 5',

  'SFPD DATE 6',
  'SFPD START TIME 6',
  'SFPD END TIME 6',
  'NUMBER OF OFFICERS 6',
  'On Location Contact 6',
  'LOCATION TO REPORT 6',
  'SFPD Activity 6',

  'SFPD DATE 7',
  'SFPD START TIME 7',
  'SFPD END TIME 7',
  'NUMBER OF OFFICERS 7',
  'On Location Contact 7',
  'LOCATION TO REPORT 7',
  'SFPD Activity 7',

  'SFPD DATE 8',
  'SFPD START TIME 8',
  'SFPD END TIME 8',
  'NUMBER OF OFFICERS 8',
  'On Location Contact 8',
  'LOCATION TO REPORT 8',
  'SFPD Activity 8',
];

const table = base.getTable(TABLE_NAME);

const query = await table.selectRecordsAsync({
  fields: [...PDF_FIELDS, ATTACHMENT_FIELD, URL_FIELD, STATUS_FIELD, TRIGGER_FIELD],
});

const record = query.getRecord(recordId);
if (!record) throw new Error(`Record not found: ${recordId}`);

await updateIfFieldExists(table, recordId, STATUS_FIELD, 'Processing');

const data = {};
for (const fieldName of PDF_FIELDS) {
  data[fieldName] = normalizeFieldValue(record.getCellValue(fieldName));
}

const payload = {
  recordId,
  data,
};

let response;
let rawText;

try {
  response = await fetch(pdfServiceUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  rawText = await response.text();
} catch (error) {
  await updateIfFieldExists(table, recordId, STATUS_FIELD, 'Request failed');
  throw new Error(`Could not reach PDF service: ${error.message}`);
}

if (!response.ok) {
  await updateIfFieldExists(table, recordId, STATUS_FIELD, `Service error ${response.status}`);
  throw new Error(`PDF service returned ${response.status}: ${rawText}`);
}

let result;
try {
  result = JSON.parse(rawText);
} catch (error) {
  await updateIfFieldExists(table, recordId, STATUS_FIELD, 'Bad service response');
  throw new Error(`Service returned invalid JSON: ${rawText}`);
}

if (!result.success || !result.pdfUrl) {
  await updateIfFieldExists(table, recordId, STATUS_FIELD, 'Generation failed');
  throw new Error(result.error || 'PDF generation failed or no pdfUrl returned');
}

const updates = {};

if (fieldExists(table, URL_FIELD)) {
  updates[URL_FIELD] = result.pdfUrl;
}

if (fieldExists(table, ATTACHMENT_FIELD)) {
  updates[ATTACHMENT_FIELD] = [
    {
      url: result.pdfUrl,
      filename: result.filename || `filled-${recordId}.pdf`,
    },
  ];
}

if (fieldExists(table, 'PDF Debug') && result.skippedFields) {
  updates['PDF Debug'] = JSON.stringify(result.skippedFields, null, 2);
}

if (fieldExists(table, STATUS_FIELD)) {
  updates[STATUS_FIELD] = 'Generated';
}

if (fieldExists(table, TRIGGER_FIELD)) {
  updates[TRIGGER_FIELD] = false;
}

await table.updateRecordAsync(recordId, updates);

output.set('success', true);
output.set('recordId', recordId);
output.set('pdfUrl', result.pdfUrl);
output.set('filename', result.filename || '');

function normalizeFieldValue(value) {
  if (value === null || value === undefined) return null;

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === 'object') {
          if ('name' in item) return item.name;
          if ('email' in item) return item.email;
          if ('url' in item) return item.url;
          if ('id' in item) return item.id;
        }
        return item;
      })
      .join(', ');
  }

  if (typeof value === 'object') {
    if ('name' in value) return value.name;
    if ('email' in value) return value.email;
    if ('id' in value) return value.id;
  }

  return value;
}

function fieldExists(table, fieldName) {
  return table.fields.some((field) => field.name === fieldName);
}

async function updateIfFieldExists(table, recordId, fieldName, value) {
  if (!fieldExists(table, fieldName)) return;
  await table.updateRecordAsync(recordId, { [fieldName]: value });
}
