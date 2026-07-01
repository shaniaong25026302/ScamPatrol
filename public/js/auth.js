// <Shania Start>
// public/js/auth.js — inline validation + fetch() to /api/auth/*.
// Validation mirrors src/utils/validate.js (server re-checks everything).
(function () {
  "use strict";

  // Password show/hide eye toggle (works for any .pw-eye next to a password input).
  document.addEventListener("click", (e) => {
    const eye = e.target.closest(".pw-eye");
    if (!eye) return;
    const input = eye.parentElement.querySelector("input");
    if (!input) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    eye.textContent = show ? "🙈" : "👁";
    eye.setAttribute("aria-label", show ? "Hide password" : "Show password");
  });

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

  function emailError(v) {
    if (!v) return "Email is required.";
    if (v.length > 255) return "Email must be 255 characters or fewer.";
    if (!EMAIL_RE.test(v)) return "Enter a valid email address.";
    return "";
  }
  function usernameError(v) {
    if (!v) return "Username is required.";
    if (!USERNAME_RE.test(v))
      return "Username must be 3–30 characters: letters, numbers or underscore only.";
    return "";
  }
  function passwordError(v) {
    if (!v) return "Password is required.";
    if (v.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(v)) return "Password needs at least one uppercase letter.";
    if (!/[0-9]/.test(v)) return "Password needs at least one number.";
    if (!/[^A-Za-z0-9]/.test(v)) return "Password needs at least one special character.";
    return "";
  }

  function setFieldError(form, field, msg) {
    const slot = form.querySelector(`.field-error[data-for="${field}"]`);
    if (slot) slot.textContent = msg || "";
    const input = form.querySelector(`[name="${field}"]`);
    if (input) input.classList.toggle("invalid", !!msg);
    return !msg;
  }

  function banner(form, id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg || "";
    el.style.display = msg ? "flex" : "none";
  }
  function clearBanners(form) {
    banner(form, "form-error", "");
    banner(form, "form-success", "");
  }

  async function postJSON(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let data = {};
    try {
      data = await res.json();
    } catch (_) {
      /* no body */
    }
    return { ok: res.ok, status: res.status, data };
  }

  // Render server-side field errors ({ errors: { field: msg } }) or a top banner.
  function applyServerErrors(form, data) {
    if (data && data.errors && typeof data.errors === "object") {
      Object.keys(data.errors).forEach((f) => setFieldError(form, f, data.errors[f]));
    }
    if (data && data.error) banner(form, "form-error", data.error);
  }

  function val(form, name) {
    const el = form.querySelector(`[name="${name}"]`);
    return el ? el.value.trim() : "";
  }
  function raw(form, name) {
    const el = form.querySelector(`[name="${name}"]`);
    return el ? el.value : "";
  }

  // ---------- Login ----------
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearBanners(loginForm);
      const email = val(loginForm, "email");
      const password = raw(loginForm, "password");
      let ok = setFieldError(loginForm, "email", emailError(email));
      ok = setFieldError(loginForm, "password", password ? "" : "Password is required.") && ok;
      if (!ok) return;

      const { ok: success, data } = await postJSON("/api/auth/login", { email, password });
      if (success) {
        const next = loginForm.getAttribute("data-next");
        window.location.href = next && next.startsWith("/") ? next : "/";
      } else {
        applyServerErrors(loginForm, data);
      }
    });
  }

  // ---------- Register ----------
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearBanners(registerForm);
      const username = val(registerForm, "username");
      const email = val(registerForm, "email");
      const password = raw(registerForm, "password");
      const confirmPassword = raw(registerForm, "confirmPassword");

      let ok = setFieldError(registerForm, "username", usernameError(username));
      ok = setFieldError(registerForm, "email", emailError(email)) && ok;
      ok = setFieldError(registerForm, "password", passwordError(password)) && ok;
      ok =
        setFieldError(
          registerForm,
          "confirmPassword",
          password === confirmPassword ? "" : "Passwords do not match.",
        ) && ok;
      if (!ok) return;

      const { ok: success, data } = await postJSON("/api/auth/register", {
        username,
        email,
        password,
        confirmPassword,
      });
      if (success) {
        window.location.href = "/";
      } else {
        applyServerErrors(registerForm, data);
      }
    });
  }

  // ---------- Forgot password ----------
  const forgotForm = document.getElementById("forgot-form");
  if (forgotForm) {
    forgotForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearBanners(forgotForm);
      const email = val(forgotForm, "email");
      if (!setFieldError(forgotForm, "email", emailError(email))) return;

      const { ok, data } = await postJSON("/api/auth/forgot-password", { email });
      if (ok) {
        let msg = data.message || "If that email is registered, a reset link has been sent.";
        // Dev convenience: the API returns a reset link when no mail service is configured.
        if (data.resetUrl) {
          banner(forgotForm, "form-success", "");
          const el = document.getElementById("form-success");
          el.style.display = "flex";
          el.innerHTML =
            msg + ' <a href="' + data.resetUrl + '">Open reset link</a>';
        } else {
          banner(forgotForm, "form-success", msg);
        }
      } else {
        applyServerErrors(forgotForm, data);
      }
    });
  }

  // ---------- Reset password ----------
  const resetForm = document.getElementById("reset-form");
  if (resetForm) {
    resetForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearBanners(resetForm);
      const token = raw(resetForm, "token");
      const password = raw(resetForm, "password");
      const confirmPassword = raw(resetForm, "confirmPassword");

      let ok = setFieldError(resetForm, "password", passwordError(password));
      ok =
        setFieldError(
          resetForm,
          "confirmPassword",
          password === confirmPassword ? "" : "Passwords do not match.",
        ) && ok;
      if (!ok) return;
      if (!token) {
        banner(resetForm, "form-error", "Missing reset token. Use the link from your email.");
        return;
      }

      const { ok: success, data } = await postJSON("/api/auth/reset-password", {
        token,
        password,
        confirmPassword,
      });
      if (success) {
        banner(resetForm, "form-success", (data.message || "Password updated.") + " Redirecting…");
        setTimeout(() => (window.location.href = "/auth/login"), 1200);
      } else {
        applyServerErrors(resetForm, data);
      }
    });
  }
})();
// <Shania End>
