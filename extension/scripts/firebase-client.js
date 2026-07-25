const FIREBASE_API_KEY  = 'AIzaSyCdF6UfLUXyY6uxZDk77Bg9cym3Pnvi9f0';
const FIREBASE_PROJECT  = 'fitme-prod-b672d';

// Maps Firestore field names → measurement keys used by the recommender
const FIELD_MAP = {
  fitme_chest:    'bust',
  fitme_waist:    'waist',
  fitme_hips:     'hips',
  fitme_inseam:   'inseam',
  fitme_shoulder: 'shoulder',
  fitme_sleeve:   'sleeve',
  fitme_neck:     'neck',
  fitme_thigh:    'thigh',
};

async function fetchMeasurements(userId) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/users/${userId}?key=${FIREBASE_API_KEY}`;
  const response = await fetch(url);
  if (response.status === 404) return { unit: 'in' }; // user has no saved measurements yet
  if (!response.ok) throw new Error('Firestore fetch failed: ' + response.status);
  const doc = await response.json();
  return parseFirestoreDoc(doc);
}

function parseFirestoreDoc(doc) {
  const fields = doc.fields || {};
  const result = {};

  for (const [firestoreKey, measurementKey] of Object.entries(FIELD_MAP)) {
    const field = fields[firestoreKey];
    if (!field) continue;
    const val = extractFirestoreMapValue(field);
    if (val !== null && val !== undefined && val !== '') {
      result[measurementKey] = parseFloat(val);
    }
  }

  // Extract unit
  const unitField = fields['fitme_unit'];
  result.unit = unitField ? (extractFirestoreMapValue(unitField) || 'in') : 'in';
  return result;
}

// Firestore REST API wraps map fields as:
// { mapValue: { fields: { value: { stringValue|doubleValue|integerValue: ... }, ts: { ... } } } }
function extractFirestoreMapValue(field) {
  const mapFields = field?.mapValue?.fields;
  if (!mapFields) return null;
  const valueField = mapFields.value;
  if (!valueField) return null;
  return valueField.stringValue ?? valueField.doubleValue ?? valueField.integerValue ?? null;
}
