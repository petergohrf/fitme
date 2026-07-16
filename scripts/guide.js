const config = window.FITME_CONFIG;
const CM_PER_INCH = 2.54;

const unitButtons = document.querySelectorAll(".unit-button");
const measurementInput = document.getElementById("measurementInput");
const measurementInputLabel = document.getElementById("measurementInputLabel");

let currentUnit = "cm";

function setUnit(unit) {
  const previousUnit = currentUnit;
  currentUnit = unit;

  unitButtons.forEach((button) => {
    const isSelected = button.dataset.unit === unit;
    button.setAttribute("aria-pressed", String(isSelected));
  });

  measurementInputLabel.textContent = `${config.measurementName} (${unit})`;

  const currentValue = parseFloat(measurementInput.value);
  if (!Number.isNaN(currentValue)) {
    let converted = currentValue;
    if (unit === "in" && previousUnit === "cm") {
      converted = currentValue / CM_PER_INCH;
    } else if (unit === "cm" && previousUnit === "in") {
      converted = currentValue * CM_PER_INCH;
    }
    measurementInput.value = Math.round(converted * 10) / 10;
  }
}

unitButtons.forEach((button) => {
  button.addEventListener("click", () => setUnit(button.dataset.unit));
});

const measurementError = document.getElementById("measurementError");
const saveButton = document.getElementById("saveButton");
const saveConfirmation = document.getElementById("saveConfirmation");
const lastSaved = document.getElementById("lastSaved");

function getRangeForUnit(unit) {
  if (unit === "cm") {
    return { min: config.minCm, max: config.maxCm };
  }
  return {
    min: Math.round((config.minCm / CM_PER_INCH) * 10) / 10,
    max: Math.round((config.maxCm / CM_PER_INCH) * 10) / 10,
  };
}

function showError(message) {
  measurementError.textContent = message;
  measurementError.hidden = false;
  measurementInput.setAttribute("aria-invalid", "true");
}

function clearError() {
  measurementError.hidden = true;
  measurementError.textContent = "";
  measurementInput.removeAttribute("aria-invalid");
}

function cmToDisplayValue(valueInCm) {
  return currentUnit === "in"
    ? Math.round((valueInCm / CM_PER_INCH) * 10) / 10
    : Math.round(valueInCm * 10) / 10;
}

function updateLastSaved(valueInCm) {
  const displayValue = cmToDisplayValue(valueInCm);
  lastSaved.textContent = `Last saved: ${displayValue} ${currentUnit}`;
  lastSaved.hidden = false;
}

function saveMeasurement() {
  clearError();
  saveConfirmation.hidden = true;

  const value = parseFloat(measurementInput.value);
  const range = getRangeForUnit(currentUnit);

  if (Number.isNaN(value)) {
    showError("Enter a number before saving.");
    return;
  }

  if (value < range.min || value > range.max) {
    showError(`Enter a value between ${range.min} and ${range.max} ${currentUnit}.`);
    return;
  }

  const valueInCm = currentUnit === "in" ? value * CM_PER_INCH : value;
  try {
    localStorage.setItem(config.storageKey, String(valueInCm));
  } catch (error) {
    showError("Couldn't save — your browser may be blocking storage.");
    return;
  }

  saveConfirmation.hidden = false;
  updateLastSaved(valueInCm);
}

saveButton.addEventListener("click", saveMeasurement);

function loadSavedMeasurement() {
  let stored;
  try {
    stored = localStorage.getItem(config.storageKey);
  } catch (error) {
    return;
  }
  if (stored === null) {
    return;
  }

  const valueInCm = parseFloat(stored);
  if (Number.isNaN(valueInCm)) {
    return;
  }

  measurementInput.value = cmToDisplayValue(valueInCm);
  updateLastSaved(valueInCm);
}

loadSavedMeasurement();
