let cropBarChart;
let cropPieChart;

document.addEventListener("DOMContentLoaded", loadCropFilters);

function loadCropFilters() {

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

function analyzeCrop() {

  const crop = document.getElementById("crop").value;
  const year = document.getElementById("year").value;

  fetch(`/api/crop-analysis?crop=${crop}&year=${year}`)
    .then(res => res.json())
    .then(data => {

      const labels = data.map(d => d.state_name);
      const values = data.map(d => Number(d.total_production));

      if (cropBarChart) cropBarChart.destroy();
      if (cropPieChart) cropPieChart.destroy();

      cropBarChart = new Chart(document.getElementById("cropBarChart"), {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: "Production",
            data: values,
            backgroundColor: "#1976d2"
          }]
        },
        options: { responsive: true }
      });

      cropPieChart = new Chart(document.getElementById("cropPieChart"), {
        type: "pie",
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: [
              "#2e7d32","#1976d2","#ff9800",
              "#9c27b0","#f44336","#00bcd4"
            ]
          }]
        }
      });

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

      document.getElementById("cropTable").innerHTML = table;

    });
}