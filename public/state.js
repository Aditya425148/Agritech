let barChart;
let pieChart;

document.addEventListener("DOMContentLoaded", loadFilters);

function loadFilters() {

  // Load States (Checkbox Style)
  fetch("/api/states")
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById("states");

      data.forEach(s => {
        const label = document.createElement("label");
        label.className = "checkbox-item";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = s.state_name;

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(" " + s.state_name));

        container.appendChild(label);
      });
    });

  // Load Crops
  fetch("/api/crops")
    .then(res => res.json())
    .then(data => {
      const select = document.getElementById("crop");
      data.forEach(c => {
        const option = document.createElement("option");
        option.value = c.crop_name;
        option.textContent = c.crop_name;
        select.appendChild(option);
      });
    });

  // Load Years
  fetch("/api/years")
    .then(res => res.json())
    .then(data => {
      const select = document.getElementById("year");
      data.forEach(y => {
        const option = document.createElement("option");
        option.value = y.year;
        option.textContent = y.year;
        select.appendChild(option);
      });
    });

}

function compareStates() {

  const states = Array.from(
    document.querySelectorAll("#states input:checked")
  ).map(cb => cb.value);

  if (states.length === 0) {
    alert("Please select at least one state");
    return;
  }

  const crop = document.getElementById("crop").value;
  const year = document.getElementById("year").value;

  fetch(`/api/state-comparison?states=${states.join(",")}&crop=${crop}&year=${year}`)
    .then(res => res.json())
    .then(data => {

      const labels = data.map(d => d.state_name);
      const values = data.map(d => Number(d.total_production));

      // Destroy old charts if exist
      if (barChart) barChart.destroy();
      if (pieChart) pieChart.destroy();

      // Bar Chart
      barChart = new Chart(document.getElementById("barChart"), {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: "Production",
            data: values,
            backgroundColor: "#2e7d32"
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true }
          }
        }
      });

      // Pie Chart
      pieChart = new Chart(document.getElementById("pieChart"), {
        type: "pie",
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: [
              "#2e7d32",
              "#1976d2",
              "#ff9800",
              "#9c27b0",
              "#f44336",
              "#00bcd4",
              "#8bc34a"
            ]
          }]
        }
      });

      // Table
      let table = `
        <tr>
          <th>State</th>
          <th>Production</th>
          <th>Area</th>
          <th>Yield</th>
        </tr>
      `;

      data.forEach(row => {
        table += `
          <tr>
            <td>${row.state_name}</td>
            <td>${row.total_production}</td>
            <td>${row.total_area}</td>
            <td>${Number(row.avg_yield).toFixed(2)}</td>
          </tr>
        `;
      });

      document.getElementById("resultTable").innerHTML = table;

    });
}