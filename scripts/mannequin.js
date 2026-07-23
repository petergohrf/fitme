// No imports in this task — Three.js added in Task 3

const DEFAULTS = {
  fitme_chest:    95,
  fitme_waist:    80,
  fitme_hips:     97,
  fitme_inseam:   76,
  fitme_shoulder: 44,
  fitme_sleeve:   63,
  fitme_neck:     37,
  fitme_thigh:    58,
};

const MEASUREMENT_META = [
  { key: 'fitme_chest',    label: 'Chest / bust',   href: 'guide/chest.html' },
  { key: 'fitme_waist',    label: 'Waist',           href: 'guide/waist.html' },
  { key: 'fitme_hips',     label: 'Hips',            href: 'guide/hips.html' },
  { key: 'fitme_inseam',   label: 'Inseam',          href: 'guide/inseam.html' },
  { key: 'fitme_shoulder', label: 'Shoulder width',  href: 'guide/shoulder.html' },
  { key: 'fitme_sleeve',   label: 'Sleeve length',   href: 'guide/sleeve.html' },
  { key: 'fitme_neck',     label: 'Neck',            href: 'guide/neck.html' },
  { key: 'fitme_thigh',    label: 'Thigh',           href: 'guide/thigh.html' },
];

function getMeasurements() {
  const result = {};
  for (const [key, defaultVal] of Object.entries(DEFAULTS)) {
    const raw = localStorage.getItem(key);
    const parsed = raw !== null ? parseFloat(raw) : NaN;
    const isDefault = raw === null || Number.isNaN(parsed);
    result[key] = { value: isDefault ? defaultVal : parsed, isDefault };
  }
  return result;
}

function populatePanel(measurements) {
  const list = document.getElementById('measurementList');
  list.innerHTML = '';
  for (const { key, label, href } of MEASUREMENT_META) {
    const { value, isDefault } = measurements[key];
    const li = document.createElement('li');
    li.className = 'measurement-row';
    if (isDefault) {
      li.innerHTML =
        `<span class="measurement-label">${label}</span>` +
        `<span class="measurement-value">` +
        `<span class="default-badge">default</span>` +
        `<a class="measure-link" href="${href}">Measure →</a>` +
        `</span>`;
    } else {
      li.innerHTML =
        `<span class="measurement-label">${label}</span>` +
        `<span class="measurement-value saved">` +
        `${Math.round(value * 10) / 10} cm ` +
        `<a class="measure-link" href="${href}">Edit →</a>` +
        `</span>`;
    }
    list.appendChild(li);
  }
}

// Entry point for this task (replaced in Task 3)
const measurements = getMeasurements();
populatePanel(measurements);
