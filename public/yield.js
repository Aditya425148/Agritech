const selectorOptions = {
  Rainfall_mm: [250, 400, 550, 700, 850, 1000, 1200, 1500, 1800, 2200],
  Temperature_Celsius: [15, 18, 20, 22, 25, 28, 30, 32, 35, 38],
  Days_to_Harvest: [60, 75, 90, 105, 120, 135, 150, 180, 210],
  Fertilizer_Used: [true, false],
  Irrigation_Used: [true, false]
};

function fillSelect(id, values, formatter = (value) => value) {
  const select = document.getElementById(id);
  select.innerHTML = `<option value="" disabled selected>Select an option</option>${values.map((value) => `<option value="${value}">${formatter(value)}</option>`).join("")}`;
}

async function loadOptions() {
  try {
    const response = await fetch("/api/yield-analyzer/options");
    if (!response.ok) throw new Error();
    const modelOptions = await response.json();
    ["Region", "Soil_Type", "Crop", "Weather_Condition"].forEach((key) => fillSelect(key, modelOptions[key]));
    ["Fertilizer_Used", "Irrigation_Used"].forEach((key) => fillSelect(key, selectorOptions[key], (value) => value ? "Yes" : "No"));
    fillSelect("Rainfall_mm", selectorOptions.Rainfall_mm, (value) => `${value} mm`);
    fillSelect("Temperature_Celsius", selectorOptions.Temperature_Celsius, (value) => `${value} °C`);
    fillSelect("Days_to_Harvest", selectorOptions.Days_to_Harvest, (value) => `${value} days`);
  } catch {
    document.getElementById("predictButton").disabled = true;
    document.getElementById("predictButton").textContent = "Model options unavailable";
  }
}

document.getElementById("yieldForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = document.getElementById("predictButton");
  const result = document.getElementById("predictionResult");
  const data = Object.fromEntries(new FormData(event.currentTarget));
  ["Rainfall_mm", "Temperature_Celsius", "Days_to_Harvest"].forEach((key) => { data[key] = Number(data[key]); });
  ["Fertilizer_Used", "Irrigation_Used"].forEach((key) => { data[key] = data[key] === "true"; });
  button.disabled = true;
  button.textContent = "Calculating prediction…";
  try {
    const response = await fetch("/api/yield-analyzer/predict", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Prediction could not be generated.");
    const yieldValue = body.predicted_yield_tons_per_hectare;
    document.getElementById("predictionValue").textContent = yieldValue.toFixed(3);
    document.getElementById("predictionSummary").textContent = `For ${data.Crop} in ${data.Region} with ${data.Soil_Type.toLowerCase()} soil.`;
    result.hidden = false;
    result.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    document.getElementById("predictionValue").textContent = "Unable to predict";
    document.getElementById("predictionSummary").textContent = error.message;
    result.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "Predict Yield";
  }
});

loadOptions();
