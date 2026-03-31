document.addEventListener("DOMContentLoaded", async function () {
  let knownStates = [];
  let knownCrops = [];

  const btn = document.getElementById("agro-ai-btn");
  const chat = document.getElementById("agro-chat");
  const closeBtn = document.getElementById("chat-close");
  const input = document.getElementById("chat-input");
  const messages = document.getElementById("chat-messages");

  const stateMap = {
    up: "uttar pradesh",
    mp: "madhya pradesh",
    tn: "tamil nadu",
    uk: "uttarakhand",
    ap: "andhra pradesh",
    wb: "west bengal",
    od: "odisha",
    orissa: "odisha",
    cg: "chhattisgarh",
    "j&k": "jammu and kashmir",
    jk: "jammu and kashmir"
  };

  const defaultCrops = ["wheat", "rice", "maize", "cotton", "sugarcane"];
  const chartPalette = ["#7d5638", "#a87045", "#c99558", "#8e6b4b", "#b68562", "#6f4a32"];

  function getChartColors(count) {
    return Array.from({ length: count }, (_, index) => chartPalette[index % chartPalette.length]);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function titleCase(value) {
    return value
      .replace(/_/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function formatNumber(value, digits = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return value;

    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: digits
    }).format(numeric);
  }

  function normalizeState(state) {
    const cleaned = state
      .trim()
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\s+/g, " ");
    return stateMap[cleaned] || cleaned;
  }

  function normalizeYear(yearText) {
    const match = yearText.match(/\b(\d{4})(?:-\d{2})?\b/);
    return match ? match[1] : null;
  }

  function addMessage(sender, html) {
    const wrapper = document.createElement("div");
    wrapper.className = sender === "user" ? "user-msg" : "bot-msg";
    wrapper.innerHTML = `<p><b>${sender === "user" ? "You" : "Agro AI"}:</b> ${html}</p>`;
    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;
    return wrapper;
  }

  function addUser(text) {
    addMessage("user", escapeHtml(text));
  }

  function addBot(text) {
    addMessage("bot", escapeHtml(text).replace(/\n/g, "<br>"));
  }

  function addHelpMessage() {
    addBot(
      "I can help with yearly trends, state comparisons, and crop-wise production views.\n" +
      "Try queries like:\n" +
      "\"wheat production of up in 2016\"\n" +
      "\"compare up and punjab wheat 2016\"\n" +
      "\"show production trend\""
    );
  }

  function appendCanvasMessage(titleText) {
    const wrapper = document.createElement("div");
    wrapper.className = "bot-msg";

    const text = document.createElement("p");
    text.innerHTML = `<b>Agro AI:</b> ${escapeHtml(titleText)}`;

    const visual = document.createElement("div");
    visual.className = "chat-visual";

    const canvas = document.createElement("canvas");
    canvas.height = 220;

    visual.appendChild(canvas);
    wrapper.appendChild(text);
    wrapper.appendChild(visual);
    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;

    return canvas;
  }

  function appendTableMessage(titleText, rows) {
    const wrapper = document.createElement("div");
    wrapper.className = "bot-msg";

    const text = document.createElement("p");
    text.innerHTML = `<b>Agro AI:</b> ${escapeHtml(titleText)}`;

    const visual = document.createElement("div");
    visual.className = "chat-visual";

    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>State</th>
          <th>Production</th>
          <th>Area</th>
          <th>Avg Yield</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td>${escapeHtml(row.state_name)}</td>
            <td>${formatNumber(row.total_production)} t</td>
            <td>${formatNumber(row.total_area)} ha</td>
            <td>${formatNumber(row.avg_yield, 2)}</td>
          </tr>
        `).join("")}
      </tbody>
    `;

    visual.appendChild(table);
    wrapper.appendChild(text);
    wrapper.appendChild(visual);
    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;
  }

  function extractCrop(query) {
    const sortedCrops = [...new Set([...knownCrops, ...defaultCrops])].sort((a, b) => b.length - a.length);
    return sortedCrops.find((crop) => query.includes(crop.toLowerCase())) || null;
  }

  function extractStates(query) {
    const normalizedQuery = query.toLowerCase().replace(/[?,]/g, " ");
    const states = [];
    const candidates = [...new Set([...knownStates, ...Object.keys(stateMap), ...Object.values(stateMap)])]
      .sort((a, b) => b.length - a.length);

    for (const candidate of candidates) {
      const regex = new RegExp(`\\b${candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (regex.test(normalizedQuery)) {
        const normalizedState = normalizeState(candidate);
        if (!states.includes(normalizedState)) {
          states.push(normalizedState);
        }
      }
    }

    return states;
  }

  function parseQuery(query) {
    const year = normalizeYear(query);
    const crop = extractCrop(query);
    const states = extractStates(query);

    if (/\b(hi|hello|hey)\b/.test(query)) {
      return { type: "greeting" };
    }

    if (query.includes("trend")) {
      return { type: "trend", crop, state: states[0] || null };
    }

    if (query.includes("compare") && states.length >= 2 && crop && year) {
      return { type: "compare", states: states.slice(0, 2), crop, year };
    }

    if (states.length >= 1 && crop && year) {
      return { type: "single", state: states[0], crop, year };
    }

    if ((query.includes("show") || query.includes("top")) && crop && year) {
      return { type: "crop-analysis", crop, year };
    }

    return { type: "unknown" };
  }

  function buildChartOptions({ isCurrency = false, showLegend = false, horizontal = false } = {}) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: horizontal ? "y" : "x",
      plugins: {
        legend: {
          display: showLegend,
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
          displayColors: true,
          callbacks: {
            label(context) {
              const value = context.parsed.x ?? context.parsed.y ?? context.parsed;
              return `${context.dataset.label}: ${formatNumber(value)}${isCurrency ? "" : " tonnes"}`;
            }
          }
        }
      },
      scales: showLegend ? {} : {
        x: {
          grid: { color: "rgba(125, 86, 56, 0.1)" },
          ticks: {
            color: "#5e6d5f",
            callback(value) {
              const numericValue = Number(value);
              return Number.isFinite(numericValue) ? formatNumber(numericValue) : value;
            }
          }
        },
        y: {
          grid: { display: false },
          ticks: { color: "#5e6d5f" }
        }
      }
    };
  }

  async function bootstrapMetadata() {
    try {
      const [statesRes, cropsRes] = await Promise.all([
        fetch("/api/states"),
        fetch("/api/crops")
      ]);

      const [statesData, cropsData] = await Promise.all([
        statesRes.json(),
        cropsRes.json()
      ]);

      knownStates = statesData.map((item) => item.state_name.toLowerCase().replace(/_/g, " "));
      knownCrops = cropsData.map((item) => item.crop_name.toLowerCase());
    } catch (error) {
      console.error("Metadata loading failed", error);
    }
  }

  async function renderTrend() {
    const res = await fetch("/api/year-trend");
    const data = await res.json();

    if (!Array.isArray(data) || !data.length) {
      addBot("No yearly trend data found.");
      return;
    }

    const labels = data.map((item) => item.year);
    const values = data.map((item) => Number(item.total_production));
    const firstYear = data[0].year;
    const lastYear = data[data.length - 1].year;
    const peakValue = Math.max(...values);
    const peakRow = data[values.indexOf(peakValue)];
    const canvas = appendCanvasMessage(
      `Yearly production trend from ${firstYear} to ${lastYear}. Peak output was in ${peakRow.year}.`
    );

    new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Production Trend",
          data: values,
          borderColor: "#7d5638",
          backgroundColor: "rgba(125, 86, 56, 0.16)",
          pointBackgroundColor: "#c99558",
          pointBorderColor: "#fffdf7",
          pointBorderWidth: 2,
          pointRadius: 3,
          tension: 0.35,
          fill: true
        }]
      },
      options: buildChartOptions()
    });
  }

  async function renderComparison(states, crop, year) {
    const res = await fetch(`/api/state-comparison?states=${encodeURIComponent(states.join(","))}&crop=${encodeURIComponent(crop)}&year=${encodeURIComponent(year)}`);
    const data = await res.json();

    if (!Array.isArray(data) || !data.length) {
      addBot(`No comparison data found for ${titleCase(crop)} in ${year}.`);
      return;
    }

    const sortedData = [...data].sort((a, b) => Number(b.total_production) - Number(a.total_production));
    const labels = sortedData.map((item) => titleCase(item.state_name));
    const values = sortedData.map((item) => Number(item.total_production));
    const canvas = appendCanvasMessage(`Comparison of ${titleCase(crop)} production in ${year}.`);

    new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Production",
          data: values,
          borderRadius: 10,
          backgroundColor: getChartColors(labels.length)
        }]
      },
      options: buildChartOptions({ horizontal: true })
    });

    appendTableMessage(`Detailed state comparison for ${titleCase(crop)} in ${year}.`, sortedData);
  }

  async function renderSingleState(state, crop, year) {
    const res = await fetch(`/api/state-comparison?states=${encodeURIComponent(state)}&crop=${encodeURIComponent(crop)}&year=${encodeURIComponent(year)}`);
    const data = await res.json();

    if (!Array.isArray(data) || !data.length) {
      addBot(`No data available for ${titleCase(crop)} in ${titleCase(state)} for ${year}.`);
      return;
    }

    const row = data[0];

    addBot(
      `${titleCase(state)} produced ${formatNumber(row.total_production)} tonnes of ${titleCase(crop)} in ${year}.\n` +
      `Total cultivated area: ${formatNumber(row.total_area)} hectares.\n` +
      `Average yield: ${formatNumber(row.avg_yield, 2)}.`
    );
  }

  async function renderCropAnalysis(crop, year) {
    const res = await fetch(`/api/crop-analysis?crop=${encodeURIComponent(crop)}&year=${encodeURIComponent(year)}`);
    const data = await res.json();

    if (!Array.isArray(data) || !data.length) {
      addBot(`No crop production data found for ${titleCase(crop)} in ${year}.`);
      return;
    }

    const topRows = [...data]
      .sort((a, b) => Number(b.total_production) - Number(a.total_production))
      .slice(0, 3);

    const labels = topRows.map((row) => titleCase(row.state_name));
    const values = topRows.map((row) => Number(row.total_production));
    const canvas = appendCanvasMessage(`Top states for ${titleCase(crop)} in ${year}.`);

    new Chart(canvas, {
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
        cutout: "60%",
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: {
              color: "#38271d",
              usePointStyle: true,
              padding: 14
            }
          },
          tooltip: {
            backgroundColor: "rgba(74, 47, 34, 0.94)",
            titleColor: "#fffdf6",
            bodyColor: "#f5eee4",
            padding: 12
          }
        }
      }
    });

    appendTableMessage(`Top crop data for ${titleCase(crop)} in ${year}.`, topRows);
  }

  function setMetric(id, value, noteId, note) {
    const valueElement = document.getElementById(id);
    const noteElement = noteId ? document.getElementById(noteId) : null;

    if (valueElement) valueElement.textContent = value;
    if (noteElement && note) noteElement.textContent = note;
  }

  fetch("/api/top-states")
    .then((res) => res.json())
    .then((data) => {
      if (!Array.isArray(data) || !data.length) return;

      const sorted = [...data].sort((a, b) => Number(b.total_production) - Number(a.total_production));
      const labels = sorted.map((item) => item.state_name);
      const values = sorted.map((item) => Number(item.total_production));

      setMetric(
        "topStateMetric",
        titleCase(sorted[0].state_name),
        "topStateMetricNote",
        `${formatNumber(sorted[0].total_production)} tonnes in the current leaderboard view.`
      );
      setMetric("statesMetric", String(sorted.length));

      const barCanvas = document.getElementById("barChart");
      if (barCanvas) {
        new Chart(barCanvas, {
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
          options: buildChartOptions({ horizontal: true })
        });
      }
    })
    .catch((error) => console.error("Top states fetch failed", error));

  fetch("/api/year-trend")
    .then((res) => res.json())
    .then((data) => {
      if (!Array.isArray(data) || !data.length) return;

      const labels = data.map((item) => item.year);
      const values = data.map((item) => Number(item.total_production));
      const maxIndex = values.indexOf(Math.max(...values));
      const direction = values[values.length - 1] >= values[0] ? "Rising" : "Softening";
      const delta = values[values.length - 1] - values[0];

      setMetric(
        "peakYearMetric",
        labels[maxIndex],
        "peakYearMetricNote",
        `${formatNumber(values[maxIndex])} tonnes recorded in the highest trend year.`
      );
      setMetric(
        "trendMetric",
        direction,
        "trendMetricNote",
        `${delta >= 0 ? "+" : ""}${formatNumber(delta)} tonnes from the earliest visible year.`
      );

      const lineCanvas = document.getElementById("lineChart");
      if (lineCanvas) {
        new Chart(lineCanvas, {
          type: "line",
          data: {
            labels,
            datasets: [{
              label: "Yearly Production",
              data: values,
              borderColor: "#7d5638",
              backgroundColor: "rgba(125, 86, 56, 0.15)",
              pointBackgroundColor: "#c99558",
              pointBorderColor: "#fffdf7",
              pointBorderWidth: 2,
              pointRadius: 4,
              tension: 0.35,
              fill: true
            }]
          },
          options: buildChartOptions()
        });
      }
    })
    .catch((error) => console.error("Year trend fetch failed", error));

  if (window.location.pathname.includes("profile.html") && btn) {
    btn.style.display = "none";
  }

  if (btn && chat) {
    btn.onclick = () => {
      document.body.classList.toggle("ai-panel-open");
    };
  }

  if (closeBtn) {
    closeBtn.onclick = () => {
      document.body.classList.remove("ai-panel-open");
    };
  }

  await bootstrapMetadata();

  if (!input || !messages) {
    return;
  }

  input.addEventListener("keypress", async (event) => {
    if (event.key !== "Enter") return;

    const rawQuery = input.value.trim();
    const query = rawQuery.toLowerCase();

    if (!query) return;

    addUser(rawQuery);
    input.value = "";

    try {
      const intent = parseQuery(query);

      if (intent.type === "greeting") {
        addBot("Hello! I am Agro AI. Ask me about production trends, state comparisons, or crop data.");
        return;
      }

      if (intent.type === "trend") {
        await renderTrend();
        return;
      }

      if (intent.type === "compare") {
        await renderComparison(intent.states, intent.crop, intent.year);
        return;
      }

      if (intent.type === "single") {
        await renderSingleState(intent.state, intent.crop, intent.year);
        return;
      }

      if (intent.type === "crop-analysis") {
        await renderCropAnalysis(intent.crop, intent.year);
        return;
      }

      addHelpMessage();
    } catch (error) {
      console.error("Agro AI request failed", error);
      addBot("Something went wrong while fetching data. Please try again.");
    }
  });
});
