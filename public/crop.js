let cropBarChart;
let cropPieChart;

const chartPalette = ["#7d5638", "#a87045", "#c99558", "#8e6b4b", "#b68562", "#6f4a32", "#d8b089"];

function getChartColors(count) {
  return Array.from({ length: count }, (_, index) => chartPalette[index % chartPalette.length]);
}

document.addEventListener("DOMContentLoaded", () => {
  loadCropFilters();
  setEmptyTable("cropTable", "Select a crop and year to generate the analysis table.");
});

function formatNumber(value, digits = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits
  }).format(numeric);
}

function setEmptyTable(tableId, message) {
  document.getElementById(tableId).innerHTML = `
    <tr>
      <td class="table-empty" colspan="4">${message}</td>
    </tr>
  `;
}

function buildChartOptions(horizontal = false) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? "y" : "x",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#223126",
          usePointStyle: true,
          padding: 18
        }
      },
      tooltip: {
        backgroundColor: "rgba(74, 47, 34, 0.94)",
        titleColor: "#fffdf6",
        bodyColor: "#f3efdf",
        padding: 12,
        callbacks: {
          label(context) {
            const value = context.parsed.x ?? context.parsed.y ?? context.parsed;
            return `${context.dataset.label}: ${formatNumber(value)} tonnes`;
          }
        }
      }
    },
    scales: horizontal ? {
      x: {
        beginAtZero: true,
        grid: { color: "rgba(125, 86, 56, 0.1)" },
        ticks: {
          color: "#5e6d5f",
          callback(value) {
            return formatNumber(value);
          }
        }
      },
      y: {
        grid: { display: false },
        ticks: { color: "#5e6d5f" }
      }
    } : {}
  };
}

function loadCropFilters() {
  fetch("/api/crops")
    .then((res) => res.json())
    .then((data) => {
      const select = document.getElementById("crop");
      data.forEach((c) => {
        const option = document.createElement("option");
        option.value = c.crop_name;
        option.textContent = c.crop_name;
        select.appendChild(option);
      });
    });

  fetch("/api/years")
    .then((res) => res.json())
    .then((data) => {
      const select = document.getElementById("year");
      data.forEach((y) => {
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

  fetch(`/api/crop-analysis?crop=${encodeURIComponent(crop)}&year=${encodeURIComponent(year)}`)
    .then((res) => res.json())
    .then((data) => {
      if (!Array.isArray(data) || !data.length) {
        setEmptyTable("cropTable", "No crop analysis data found for the selected filters.");
        return;
      }

      const sortedData = [...data].sort((a, b) => Number(b.total_production) - Number(a.total_production));
      const labels = sortedData.map((d) => d.state_name);
      const values = sortedData.map((d) => Number(d.total_production));

      if (cropBarChart) cropBarChart.destroy();
      if (cropPieChart) cropPieChart.destroy();

      cropBarChart = new Chart(document.getElementById("cropBarChart"), {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: "Production",
            data: values,
            borderRadius: 12,
            backgroundColor: getChartColors(labels.length)
          }]
        },
        options: buildChartOptions(true)
      });

      cropPieChart = new Chart(document.getElementById("cropPieChart"), {
        type: "doughnut",
        data: {
          labels,
          datasets: [{
            label: "Production Share",
            data: values,
            backgroundColor: getChartColors(labels.length),
            borderColor: "#fffdf7",
            borderWidth: 3,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "62%",
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: "#223126",
                usePointStyle: true,
                padding: 18
              }
            },
            tooltip: {
              backgroundColor: "rgba(74, 47, 34, 0.94)",
              titleColor: "#fffdf6",
              bodyColor: "#f3efdf",
              padding: 12,
              callbacks: {
                label(context) {
                  const total = context.dataset.data.reduce((sum, value) => sum + Number(value), 0);
                  const value = Number(context.parsed);
                  const share = total ? ((value / total) * 100).toFixed(1) : "0.0";
                  return `${context.label}: ${formatNumber(value)} tonnes (${share}%)`;
                }
              }
            }
          }
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

      sortedData.forEach((row) => {
        table += `
          <tr>
            <td>${row.state_name}</td>
            <td>${formatNumber(row.total_production)}</td>
            <td>${formatNumber(row.total_area)}</td>
            <td>${formatNumber(row.avg_yield, 2)}</td>
          </tr>
        `;
      });

      document.getElementById("cropTable").innerHTML = table;
    })
    .catch((error) => {
      console.error("Crop analysis failed", error);
      setEmptyTable("cropTable", "Something went wrong while loading crop analysis.");
    });
}
