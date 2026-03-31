document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("auth-form");
  const title = document.getElementById("auth-title");
  const message = document.getElementById("auth-message");
  const submitButton = document.getElementById("auth-submit");
  const tabs = document.querySelectorAll(".auth-tab");
  const signupFields = document.querySelectorAll(".signup-only");

  const nameInput = document.getElementById("signup-name");
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const rememberInput = document.getElementById("remember-user");

  const SESSION_KEY = "agritech_current_user";
  let mode = "login";

  function setMessage(text, type) {
    message.hidden = false;
    message.textContent = text;
    message.className = `auth-message ${type}`;
  }

  function clearMessage() {
    message.hidden = true;
    message.textContent = "";
    message.className = "auth-message";
  }

  function updateMode(nextMode) {
    mode = nextMode;
    const signupMode = mode === "signup";

    title.textContent = signupMode ? "Create your Agritech account" : "Login to Agritech";
    submitButton.textContent = signupMode ? "Sign Up" : "Login";

    signupFields.forEach((field) => {
      field.hidden = !signupMode;
    });

    tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.mode === mode);
    });

    clearMessage();
  }

  function normalizeEmail(value) {
    return value.trim().toLowerCase();
  }

  async function postJson(url, body) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }

    return data;
  }

  function saveSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      name: user.name,
      email: user.email,
      remembered: rememberInput.checked
    }));
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => updateMode(tab.dataset.mode));
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    const name = nameInput.value.trim();
    const email = normalizeEmail(emailInput.value);
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!email || !password) {
      setMessage("Please enter your email and password.", "error");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = mode === "signup" ? "Signing Up..." : "Logging In...";

    try {
      if (mode === "signup") {
        if (!name) {
          setMessage("Please enter your full name before signing up.", "error");
          return;
        }

        if (password.length < 6) {
          setMessage("Password must be at least 6 characters long.", "error");
          return;
        }

        if (password !== confirmPassword) {
          setMessage("Password and confirm password do not match.", "error");
          return;
        }

        const data = await postJson("/api/auth/signup", {
          name,
          email,
          password
        });

        saveSession(data.user);
        setMessage("Sign up successful. Redirecting to your dashboard...", "success");
        window.setTimeout(() => {
          window.location.href = "./index.html";
        }, 900);
        return;
      }

      const data = await postJson("/api/auth/login", {
        email,
        password
      });

      saveSession(data.user);
      setMessage(`Welcome back, ${data.user.name}. Redirecting to your dashboard...`, "success");
      window.setTimeout(() => {
        window.location.href = "./index.html";
      }, 900);
    } catch (error) {
      setMessage(error.message, "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = mode === "signup" ? "Sign Up" : "Login";
    }
  });

  updateMode("login");
});
