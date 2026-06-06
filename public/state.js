(function () {
  let barChart;
  let pieChart;

  const analysisPalette = [
    "#c96f3b",
    "#2f7f6b",
    "#d6a445",
    "#7a5cff",
    "#cf4f6a",
    "#2d9cdb",
    "#8f5b2e",
    "#3f8f3f",
    "#e07a5f",
    "#5c677d"
  ];

  function getChartColors(count) {
    return Array.from({ length: count }, (_, index) => analysisPalette[index % analysisPalette.length]);
  }

  function formatNumber(value, digits = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return value;

    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: digits
    }).format(numeric);
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

  function setEmptyTable(tableId, message) {
    document.getElementById(tableId).innerHTML = `
      <tr>
        <td class="table-empty" colspan="4">${message}</td>
      </tr>
    `;
  }

  function loadFilters() {
    fetch("/api/states")
      .then((res) => res.json())
      .then((data) => {
        const container = document.getElementById("states");
        if (!container) return;

        data.forEach((s) => {
          const label = document.createElement("label");
          label.className = "checkbox-item";

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.value = s.state_name;

          const text = document.createElement("span");
          text.textContent = s.state_name.replace(/_/g, " ");

          label.appendChild(checkbox);
          label.appendChild(text);
          container.appendChild(label);
        });
      });

    fetch("/api/crops")
      .then((res) => res.json())
      .then((data) => {
        const select = document.getElementById("crop");
        if (!select) return;

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
        if (!select) return;

        data.forEach((y) => {
          const option = document.createElement("option");
          option.value = y.year;
          option.textContent = y.year;
          select.appendChild(option);
        });
      });
  }

  function compareStates() {
    const states = Array.from(document.querySelectorAll("#states input:checked")).map((cb) => cb.value);

    if (states.length === 0) {
      alert("Please select at least one state");
      return;
    }

    const crop = document.getElementById("crop").value;
    const year = document.getElementById("year").value;

    fetch(`/api/state-comparison?states=${encodeURIComponent(states.join(","))}&crop=${encodeURIComponent(crop)}&year=${encodeURIComponent(year)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data) || !data.length) {
          setEmptyTable("resultTable", "No comparison data found for the selected filters.");
          return;
        }

        const sortedData = [...data].sort((a, b) => Number(b.total_production) - Number(a.total_production));
        const labels = sortedData.map((d) => d.state_name.replace(/_/g, " "));
        const values = sortedData.map((d) => Number(d.total_production));
        const colors = getChartColors(labels.length);

        if (barChart) barChart.destroy();
        if (pieChart) pieChart.destroy();

        barChart = new Chart(document.getElementById("barChart"), {
          type: "bar",
          data: {
            labels,
            datasets: [{
              label: "Production",
              data: values,
              borderRadius: 12,
              backgroundColor: colors,
              borderColor: colors,
              borderWidth: 1
            }]
          },
          options: buildChartOptions(true)
        });

        pieChart = new Chart(document.getElementById("pieChart"), {
          type: "doughnut",
          data: {
            labels,
            datasets: [{
              label: "Production Share",
              data: values,
              backgroundColor: colors,
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
              <td>${row.state_name.replace(/_/g, " ")}</td>
              <td>${formatNumber(row.total_production)}</td>
              <td>${formatNumber(row.total_area)}</td>
              <td>${formatNumber(row.avg_yield, 2)}</td>
            </tr>
          `;
        });

        document.getElementById("resultTable").innerHTML = table;
      })
      .catch((error) => {
        console.error("State comparison failed", error);
        setEmptyTable("resultTable", "Something went wrong while loading comparison data.");
      });
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadFilters();
    setEmptyTable("resultTable", "Select states, crop, and year to see comparison details.");
  });

  window.compareStates = compareStates;
})();
