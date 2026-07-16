const CM_PER_INCH = 2.54;
const STORAGE_KEY = "fitme_chest";
const MIN_CM = 30;
const MAX_CM = 200;

const unitButtons = document.querySelectorAll(".unit-button");
const chestInput = document.getElementById("chestInput");
const chestInputLabel = document.getElementById("chestInputLabel");

let currentUnit = "cm";

function setUnit(unit) {
  const previousUnit = currentUnit;
  currentUnit = unit;

  unitButtons.forEach((button) => {
    const isSelected = button.dataset.unit === unit;
    button.setAttribute("aria-pressed", String(isSelected));
  });

  chestInputLabel.textContent = `Chest/bust measurement (${unit})`;

  const currentValue = parseFloat(chestInput.value);
  if (!Number.isNaN(currentValue)) {
    let converted = currentValue;
    if (unit === "in" && previousUnit === "cm") {
      converted = currentValue / CM_PER_INCH;
    } else if (unit === "cm" && previousUnit === "in") {
      converted = currentValue * CM_PER_INCH;
    }
    chestInput.value = Math.round(converted * 10) / 10;
  }
}

unitButtons.forEach((button) => {
  button.addEventListener("click", () => setUnit(button.dataset.unit));
});

const chestError = document.getElementById("chestError");
const saveButton = document.getElementById("saveButton");
const saveConfirmation = document.getElementById("saveConfirmation");
const lastSaved = document.getElementById("lastSaved");

function getRangeForUnit(unit) {
  if (unit === "cm") {
    return { min: MIN_CM, max: MAX_CM };
  }
  return {
    min: Math.round((MIN_CM / CM_PER_INCH) * 10) / 10,
    max: Math.round((MAX_CM / CM_PER_INCH) * 10) / 10,
  };
}

function showError(message) {
  chestError.textContent = message;
  chestError.hidden = false;
  chestInput.setAttribute("aria-invalid", "true");
}

function clearError() {
  chestError.hidden = true;
  chestError.textContent = "";
  chestInput.removeAttribute("aria-invalid");
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

  const value = parseFloat(chestInput.value);
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
    localStorage.setItem(STORAGE_KEY, String(valueInCm));
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
    stored = localStorage.getItem(STORAGE_KEY);
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

  chestInput.value = cmToDisplayValue(valueInCm);
  updateLastSaved(valueInCm);
}

loadSavedMeasurement();
