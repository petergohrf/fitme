// UMD wrapper: works as require() in Node.js tests AND as <script> in the browser.
(function(root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.FitMeMerge = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function() {

  var SYNC_KEYS = [
    'fitme_chest', 'fitme_waist', 'fitme_hips', 'fitme_inseam',
    'fitme_shoulder', 'fitme_sleeve', 'fitme_neck', 'fitme_thigh',
    'fitme_unit',
  ];

  // mergeProfiles compares local and cloud snapshots field by field.
  // localData:    { [key]: { value: string|null, ts: number } }
  // firestoreDoc: { [key]: { value: any, ts: number } } | null
  // Returns:      { toFirestore: {...}, toLocalStorage: {...} }
  //   toFirestore  — fields where local ts >= cloud ts AND local has a value (push up)
  //   toLocalStorage — fields where cloud ts > local ts AND cloud has a value (pull down)
  function mergeProfiles(localData, firestoreDoc) {
    var toFirestore = {};
    var toLocalStorage = {};

    SYNC_KEYS.forEach(function(key) {
      var local = (localData && localData[key]) || { value: null, ts: 0 };
      var cloud = (firestoreDoc && firestoreDoc[key]) || { value: null, ts: 0 };

      if (local.ts >= cloud.ts) {
        if (local.value !== null) {
          toFirestore[key] = { value: local.value, ts: local.ts };
        }
      } else {
        if (cloud.value !== null) {
          toLocalStorage[key] = { value: cloud.value, ts: cloud.ts };
        }
      }
    });

    return { toFirestore: toFirestore, toLocalStorage: toLocalStorage };
  }

  return { mergeProfiles: mergeProfiles, SYNC_KEYS: SYNC_KEYS };
}));
