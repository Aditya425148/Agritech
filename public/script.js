document.addEventListener("DOMContentLoaded", async function () {
  let knownStates = [];
  let knownCrops = [];

  const btn = document.getElementById("agro-ai-btn");
  const chat = document.getElementById("agro-chat");
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

  function formatNumber(value, digits = 2) {
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
    const safeHtml = escapeHtml(text).replace(/\n/g, "<br>");
    addMessage("bot", safeHtml);
  }

  function addHelpMessage() {
    addBot(
      "I can:\n" +
      "- Show production trend\n" +
      "- Compare two states\n" +
      "- Show crop production by state and year\n\n" +
      "Try:\n" +
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

    const canvas = document.createElement("canvas");
    canvas.height = 200;

    wrapper.appendChild(text);
    wrapper.appendChild(canvas);
    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;

    return canvas;
  }

  function appendTableMessage(titleText, rows) {
    const wrapper = document.createElement("div");
    wrapper.className = "bot-msg";

    const text = document.createElement("p");
    text.innerHTML = `<b>Agro AI:</b> ${escapeHtml(titleText)}`;

    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.marginTop = "8px";

    table.innerHTML = `
      <thead>
        <tr>
          <th style="text-align:left;border-bottom:1px solid #ccc;padding:6px;">State</th>
          <th style="text-align:left;border-bottom:1px solid #ccc;padding:6px;">Production</th>
          <th style="text-align:left;border-bottom:1px solid #ccc;padding:6px;">Area</th>
          <th style="text-align:left;border-bottom:1px solid #ccc;padding:6px;">Avg Yield</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td style="padding:6px;border-bottom:1px solid #eee;">${escapeHtml(row.state_name)}</td>
            <td style="padding:6px;border-bottom:1px solid #eee;">${formatNumber(row.total_production)} tonnes</td>
            <td style="padding:6px;border-bottom:1px solid #eee;">${formatNumber(row.total_area)} ha</td>
            <td style="padding:6px;border-bottom:1px solid #eee;">${formatNumber(row.avg_yield)}</td>
          </tr>
        `).join("")}
      </tbody>
    `;

    wrapper.appendChild(text);
    wrapper.appendChild(table);
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
    const canvas = appendCanvasMessage("Here is the yearly production trend.");

    new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Production Trend",
          data: values,
          borderColor: "#2e7d32",
          backgroundColor: "rgba(46, 125, 50, 0.15)",
          tension: 0.3,
          fill: true
        }]
      }
    });
  }

  async function renderComparison(states, crop, year) {
    const res = await fetch(`/api/state-comparison?states=${encodeURIComponent(states.join(","))}&crop=${encodeURIComponent(crop)}&year=${encodeURIComponent(year)}`);
    const data = await res.json();

    if (!Array.isArray(data) || !data.length) {
      addBot(`No comparison data found for ${titleCase(crop)} in ${year}.`);
      return;
    }

    const labels = data.map((item) => item.state_name);
    const values = data.map((item) => Number(item.total_production));
    const canvas = appendCanvasMessage(`Comparison of ${titleCase(crop)} production in ${year}.`);

    new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Production",
          data: values,
          backgroundColor: ["#1976d2", "#43a047", "#fb8c00", "#8e24aa"]
        }]
      }
    });

    appendTableMessage(`Detailed comparison for ${titleCase(crop)} in ${year}.`, data);
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
      `Average yield: ${formatNumber(row.avg_yield)}.`
    );
  }

  async function renderCropAnalysis(crop, year) {
    const res = await fetch(`/api/crop-analysis?crop=${encodeURIComponent(crop)}&year=${encodeURIComponent(year)}`);
    const data = await res.json();

    if (!Array.isArray(data) || !data.length) {
      addBot(`No crop production data found for ${titleCase(crop)} in ${year}.`);
      return;
    }

    appendTableMessage(`Top states for ${titleCase(crop)} production in ${year}.`, data);
  }

  fetch("/api/top-states")
    .then((res) => res.json())
    .then((data) => {
      if (!Array.isArray(data) || !data.length) return;

      const labels = data.map((item) => item.state_name);
      const values = data.map((item) => Number(item.total_production));

      const barCanvas = document.getElementById("barChart");
      if (barCanvas) {
        new Chart(barCanvas, {
          type: "bar",
          data: {
            labels,
            datasets: [{
              label: "Production (Tonnes)",
              data: values,
              backgroundColor: "#2e7d32"
            }]
          }
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

      const lineCanvas = document.getElementById("lineChart");
      if (lineCanvas) {
        new Chart(lineCanvas, {
          type: "line",
          data: {
            labels,
            datasets: [{
              label: "Yearly Production",
              data: values,
              borderColor: "#1976d2",
              fill: false
            }]
          }
        });
      }
    })
    .catch((error) => console.error("Year trend fetch failed", error));

  if (window.location.pathname.includes("profile.html") && btn) {
    btn.style.display = "none";
  }

  if (btn && chat) {
    btn.onclick = () => {
      chat.style.display = chat.style.display === "flex" ? "none" : "flex";
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
