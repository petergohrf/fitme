const { test, expect } = require('@playwright/test');

// merge-profiles.js uses UMD — load it for Node.js directly
const FitMeMerge = require('../scripts/merge-profiles.js');
const { mergeProfiles, SYNC_KEYS } = FitMeMerge;

test.describe('mergeProfiles', () => {
  function makeLocal(overrides) {
    const base = {};
    SYNC_KEYS.forEach(function(k) { base[k] = { value: null, ts: 0 }; });
    return Object.assign(base, overrides);
  }

  test('local newer than cloud: local value goes to toFirestore', () => {
    const local = makeLocal({ fitme_chest: { value: '90', ts: 2000 } });
    const cloud = { fitme_chest: { value: 85, ts: 1000 } };

    const result = mergeProfiles(local, cloud);

    expect(result.toFirestore['fitme_chest']).toEqual({ value: '90', ts: 2000 });
    expect(result.toLocalStorage['fitme_chest']).toBeUndefined();
  });

  test('cloud newer than local: cloud value goes to toLocalStorage', () => {
    const local = makeLocal({ fitme_waist: { value: '70', ts: 1000 } });
    const cloud = { fitme_waist: { value: 65, ts: 3000 } };

    const result = mergeProfiles(local, cloud);

    expect(result.toLocalStorage['fitme_waist']).toEqual({ value: 65, ts: 3000 });
    expect(result.toFirestore['fitme_waist']).toBeUndefined();
  });

  test('equal timestamps: local wins (goes to toFirestore)', () => {
    const local = makeLocal({ fitme_hips: { value: '95', ts: 5000 } });
    const cloud = { fitme_hips: { value: 90, ts: 5000 } };

    const result = mergeProfiles(local, cloud);

    expect(result.toFirestore['fitme_hips']).toEqual({ value: '95', ts: 5000 });
    expect(result.toLocalStorage['fitme_hips']).toBeUndefined();
  });

  test('field absent in local, present in cloud: cloud wins', () => {
    const local = makeLocal({}); // fitme_neck has value:null, ts:0
    const cloud = { fitme_neck: { value: 37, ts: 1000 } };

    const result = mergeProfiles(local, cloud);

    expect(result.toLocalStorage['fitme_neck']).toEqual({ value: 37, ts: 1000 });
    expect(result.toFirestore['fitme_neck']).toBeUndefined();
  });

  test('field present in local, absent in cloud: local wins', () => {
    const local = makeLocal({ fitme_thigh: { value: '58', ts: 1000 } });
    const cloud = null;

    const result = mergeProfiles(local, cloud);

    expect(result.toFirestore['fitme_thigh']).toEqual({ value: '58', ts: 1000 });
    expect(result.toLocalStorage['fitme_thigh']).toBeUndefined();
  });

  test('field absent in both: skipped in both outputs', () => {
    const local = makeLocal({});
    const cloud = null;

    const result = mergeProfiles(local, cloud);

    SYNC_KEYS.forEach(function(k) {
      expect(result.toFirestore[k]).toBeUndefined();
      expect(result.toLocalStorage[k]).toBeUndefined();
    });
  });

  test('unit preference treated same as a measurement field', () => {
    const local = makeLocal({ fitme_unit: { value: 'in', ts: 500 } });
    const cloud = { fitme_unit: { value: 'cm', ts: 2000 } };

    const result = mergeProfiles(local, cloud);

    expect(result.toLocalStorage['fitme_unit']).toEqual({ value: 'cm', ts: 2000 });
    expect(result.toFirestore['fitme_unit']).toBeUndefined();
  });
});
