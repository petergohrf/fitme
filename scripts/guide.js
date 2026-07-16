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
