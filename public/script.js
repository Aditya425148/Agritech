document.addEventListener("DOMContentLoaded", async function () {
  let knownStates = [];
  let knownCrops = [];

  const btn = document.getElementById("agro-ai-btn");
  const chat = document.getElementById("agro-chat");
  const closeBtn = document.getElementById("chat-close");
  const input = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send");
  const messages = document.getElementById("chat-messages");
  const quickActions = document.getElementById("chat-quick-actions");
  const isDashboardPage =
    Boolean(document.getElementById("topStateMetric")) &&
    Boolean(document.getElementById("peakYearMetric")) &&
    Boolean(document.getElementById("lineChart"));

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
  const starterPrompts = [
    "Show top producing states",
    "Show production trend",
    "Give dashboard summary",
    "Show top wheat states in 2016",
    "Compare Punjab and Haryana wheat 2016"
  ];

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
    return String(value || "")
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
    const cleaned = String(state || "")
      .trim()
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\s+/g, " ");
    return stateMap[cleaned] || cleaned;
  }

  function normalizeYear(yearText) {
    const match = String(yearText || "").match(/\b(\d{4})(?:-\d{2})?\b/);
    return match ? match[1] : null;
  }

  function addMessage(sender, html) {
    const wrapper = document.createElement("div");
    wrapper.className = sender === "user" ? "user-msg" : "bot-msg";
    wrapper.innerHTML = `<p><b>${sender === "user" ? "You" : "Agro Ai"}:</b> ${html}</p>`;
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

  function addStatus(text) {
    const wrapper = document.createElement("div");
    wrapper.className = "bot-msg bot-msg-status";
    wrapper.innerHTML = `<p><b>Agro Ai:</b> ${escapeHtml(text)}</p>`;
    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;
    return wrapper;
  }

  function removeNode(node) {
    if (node && node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }

  function openPanel() {
    document.body.classList.add("ai-panel-open");
    if (input) {
      window.setTimeout(() => input.focus(), 180);
    }
  }

  function appendCanvasMessage(titleText) {
    const wrapper = document.createElement("div");
    wrapper.className = "bot-msg";

    const text = document.createElement("p");
    text.innerHTML = `<b>Agro Ai:</b> ${escapeHtml(titleText)}`;

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
    text.innerHTML = `<b>Agro Ai:</b> ${escapeHtml(titleText)}`;

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
            <td>${escapeHtml(titleCase(row.state_name))}</td>
            <td>${formatNumber(row.total_production)} t</td>
            <td>${row.total_area == null ? "-" : `${formatNumber(row.total_area)} ha`}</td>
            <td>${row.avg_yield == null ? "-" : formatNumber(row.avg_yield, 2)}</td>
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

  function addWelcomeMessage() {
    const wrapper = document.createElement("div");
    wrapper.className = "bot-msg bot-msg-intro";
    wrapper.innerHTML = `
      <p><b>Agro Ai:</b> I can work across this website's agriculture data and visuals.</p>
      <ul class="chat-capability-list">
        <li>Summarize the dashboard and latest visible insights.</li>
        <li>Show top producing states with a chart.</li>
        <li>Compare states for a crop and year.</li>
        <li>Highlight crop leaders and render charts or tables.</li>
      </ul>
    `;
    messages.appendChild(wrapper);
  }

  function addHelpMessage() {
    addBot(
      "I can help with dashboard summaries, yearly trends, top states, state comparisons, and crop-wise analysis.\n" +
      "Try queries like:\n" +
      "\"show top producing states\"\n" +
      "\"show production trend\"\n" +
      "\"compare punjab and haryana wheat 2016\"\n" +
      "\"show top rice states in 2018\"\n" +
      "\"give dashboard summary\""
    );
  }

  function renderQuickActions() {
    if (!quickActions) return;

    quickActions.innerHTML = "";

    starterPrompts.forEach((prompt) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chat-chip";
      chip.textContent = prompt;
      chip.addEventListener("click", () => handleQuery(prompt));
      quickActions.appendChild(chip);
    });
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

    if (/\b(help|what can you do|how to use)\b/.test(query)) {
      return { type: "help" };
    }

    if (query.includes("dashboard") || query.includes("summary") || query.includes("overview")) {
      return { type: "dashboard-summary" };
    }

    if ((query.includes("top") && query.includes("state")) || query.includes("leaderboard")) {
      return { type: "top-states" };
    }

    if (query.includes("trend")) {
      return { type: "trend", crop, state: states[0] || null };
    }

    if (query.includes("compare") && states.length >= 2 && crop && year) {
      return { type: "compare", states: states.slice(0, 5), crop, year };
    }

    if ((query.includes("show") || query.includes("top")) && crop && year) {
      return { type: "crop-analysis", crop, year };
    }

    if (states.length >= 1 && crop && year) {
      return { type: "single", state: states[0], crop, year };
    }

    return { type: "unknown" };
  }

  function buildChartOptions({ showLegend = false, horizontal = false } = {}) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: horizontal ? "y" : "x",
      plugins: {
        legend: {
          display: showLegend,
          position: "bottom",
          labels: {
            color: "#38271d",
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

  async function getJson(url, fallbackMessage) {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || fallbackMessage);
    }

    return data;
  }

  async function renderTrend() {
    const data = await getJson("/api/year-trend", "Unable to load yearly trend data.");

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
    const growth = values[values.length - 1] - values[0];
    const canvas = appendCanvasMessage(
      `Yearly production trend from ${firstYear} to ${lastYear}. Peak output was in ${peakRow.year}, and the overall change was ${growth >= 0 ? "up" : "down"} ${formatNumber(Math.abs(growth))} tonnes.`
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

  async function renderTopStates() {
    const data = await getJson("/api/top-states", "Unable to load top states.");

    if (!Array.isArray(data) || !data.length) {
      addBot("No top state data found.");
      return;
    }

    const sortedData = [...data].sort((a, b) => Number(b.total_production) - Number(a.total_production));
    const labels = sortedData.map((item) => titleCase(item.state_name));
    const values = sortedData.map((item) => Number(item.total_production));
    const leader = sortedData[0];
    const canvas = appendCanvasMessage(
      `${titleCase(leader.state_name)} leads the current top-state view with ${formatNumber(leader.total_production)} tonnes.`
    );

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

    appendTableMessage("Top producing states with output details.", sortedData);
  }

  async function renderComparison(states, crop, year) {
    const data = await getJson(
      `/api/state-comparison?states=${encodeURIComponent(states.join(","))}&crop=${encodeURIComponent(crop)}&year=${encodeURIComponent(year)}`,
      "Unable to load state comparison."
    );

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
    const data = await getJson(
      `/api/state-comparison?states=${encodeURIComponent(state)}&crop=${encodeURIComponent(crop)}&year=${encodeURIComponent(year)}`,
      "Unable to load state details."
    );

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
    const data = await getJson(
      `/api/crop-analysis?crop=${encodeURIComponent(crop)}&year=${encodeURIComponent(year)}`,
      "Unable to load crop analysis."
    );

    if (!Array.isArray(data) || !data.length) {
      addBot(`No crop production data found for ${titleCase(crop)} in ${year}.`);
      return;
    }

    const sortedData = [...data].sort((a, b) => Number(b.total_production) - Number(a.total_production));
    const labels = sortedData.slice(0, 5).map((row) => titleCase(row.state_name));
    const values = sortedData.slice(0, 5).map((row) => Number(row.total_production));
    const leader = sortedData[0];
    const canvas = appendCanvasMessage(
      `${titleCase(leader.state_name)} is leading ${titleCase(crop)} production in ${year} with ${formatNumber(leader.total_production)} tonnes.`
    );

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

    appendTableMessage(`Top crop data for ${titleCase(crop)} in ${year}.`, sortedData.slice(0, 5));
  }

  async function renderDashboardSummary() {
    const [topStates, trendData] = await Promise.all([
      getJson("/api/top-states", "Unable to load top states."),
      getJson("/api/year-trend", "Unable to load trend data.")
    ]);

    if (!Array.isArray(topStates) || !topStates.length || !Array.isArray(trendData) || !trendData.length) {
      addBot("I could not build the dashboard summary because some data is missing.");
      return;
    }

    const topLeader = [...topStates].sort((a, b) => Number(b.total_production) - Number(a.total_production))[0];
    const trendValues = trendData.map((item) => Number(item.total_production));
    const peakValue = Math.max(...trendValues);
    const peakYear = trendData[trendValues.indexOf(peakValue)].year;
    const first = trendValues[0];
    const last = trendValues[trendValues.length - 1];

    addBot(
      `Dashboard summary:\n` +
      `${titleCase(topLeader.state_name)} is currently the strongest state in the top-production leaderboard with ${formatNumber(topLeader.total_production)} tonnes.\n` +
      `The highest yearly output appears in ${peakYear} at ${formatNumber(peakValue)} tonnes.\n` +
      `Across the visible trend, production ${last >= first ? "increased" : "decreased"} by ${formatNumber(Math.abs(last - first))} tonnes.`
    );
  }

  function setMetric(id, value, noteId, note) {
    const valueElement = document.getElementById(id);
    const noteElement = noteId ? document.getElementById(noteId) : null;

    if (valueElement) valueElement.textContent = value;
    if (noteElement && note) noteElement.textContent = note;
  }

  async function handleIntent(intent) {
    if (intent.type === "greeting") {
      addBot("Hello! I am Agro Ai. Ask me about production trends, top states, crop analysis, or state comparisons.");
      return;
    }

    if (intent.type === "help") {
      addHelpMessage();
      return;
    }

    if (intent.type === "dashboard-summary") {
      await renderDashboardSummary();
      return;
    }

    if (intent.type === "top-states") {
      await renderTopStates();
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
  }

  async function handleQuery(rawQuery) {
    const trimmed = String(rawQuery || "").trim();
    const query = trimmed.toLowerCase();

    if (!query || !messages) return;

    openPanel();
    addUser(trimmed);
    if (input) input.value = "";

    const pending = addStatus("Working on that...");

    try {
      const intent = parseQuery(query);
      removeNode(pending);
      await handleIntent(intent);
    } catch (error) {
      removeNode(pending);
      console.error("Agro Ai request failed", error);
      addBot(error.message || "Something went wrong while fetching data. Please try again.");
    }
  }

  if (isDashboardPage) {
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
  }

  if (window.location.pathname.includes("profile.html") && btn) {
    btn.style.display = "none";
  }

  if (btn && chat) {
    btn.addEventListener("click", () => {
      document.body.classList.toggle("ai-panel-open");
      if (document.body.classList.contains("ai-panel-open") && input) {
        window.setTimeout(() => input.focus(), 180);
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.body.classList.remove("ai-panel-open");
    });
  }

  await bootstrapMetadata();

  if (!input || !messages) {
    return;
  }

  addWelcomeMessage();
  renderQuickActions();

  input.addEventListener("keypress", async (event) => {
    if (event.key !== "Enter") return;
    await handleQuery(input.value);
  });

  if (sendBtn) {
    sendBtn.addEventListener("click", async () => {
      await handleQuery(input.value);
    });
  }
});
