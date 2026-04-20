import { useState } from "react";
import {
  validateUsername,
  validatePassword,
  validateConfirmPassword,
} from "../../utils/helpers.js";

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: "", color: "transparent", width: "0%" };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const percentage = Math.min(100, (score / 5) * 100);
  if (score <= 2) {
    return { score, label: "Weak", color: "#ef4444", width: `${percentage}%` };
  }
  if (score <= 3) {
    return { score, label: "Medium", color: "#f59e0b", width: `${percentage}%` };
  }
  if (score <= 4) {
    return { score, label: "Strong", color: "#22c55e", width: `${percentage}%` };
  }
  return { score, label: "Very strong", color: "#14b8a6", width: "100%" };
}

export default function SignupForm({ onSignup, onSwitchToLogin, onGuestLogin, loading, error }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  function validate() {
    const errors = {};
    const u = validateUsername(username);
    const p = validatePassword(password);
    const c = validateConfirmPassword(password, confirm);
    if (u) errors.username = u;
    if (p) errors.password = p;
    if (c) errors.confirm = c;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    onSignup(username.trim(), password);
  }

  const inputClass = (hasError) =>
    `w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all placeholder-[color:var(--color-text-muted)] focus:ring-2 ${
      hasError ? "border-red-500/50" : ""
    }`;

  const passwordStrength = getPasswordStrength(password);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {/* Global error */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm" style={{ color: "#fb7185" }}>
          {error}
        </div>
      )}

      {/* Username */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setFieldErrors((p) => ({ ...p, username: null }));
          }}
          placeholder="choose_a_username"
          autoComplete="username"
          className={inputClass(fieldErrors.username)}
          style={{
            color: "var(--color-text)",
            background: "color-mix(in srgb, var(--color-surface) 88%, var(--color-background) 12%)",
            borderColor: fieldErrors.username ? "rgba(239,68,68,.45)" : "color-mix(in srgb, var(--color-text-muted) 28%, transparent)",
          }}
        />
        {fieldErrors.username && (
          <p className="text-xs text-red-400">{fieldErrors.username}</p>
        )}
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Password</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setFieldErrors((p) => ({ ...p, password: null }));
            }}
            placeholder="••••••••"
            autoComplete="new-password"
            className={inputClass(fieldErrors.password) + " pr-12"}
            style={{
              color: "var(--color-text)",
              background: "color-mix(in srgb, var(--color-surface) 88%, var(--color-background) 12%)",
              borderColor: fieldErrors.password ? "rgba(239,68,68,.45)" : "color-mix(in srgb, var(--color-text-muted) 28%, transparent)",
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors p-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            {showPassword ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        <div className="mt-1">
          <div
            className="h-1.5 w-full rounded-full overflow-hidden"
            style={{ background: "color-mix(in srgb, var(--color-surface) 80%, var(--color-background) 20%)" }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{ width: passwordStrength.width, background: passwordStrength.color }}
            />
          </div>
          <p className="mt-1 text-[11px]" style={{ color: password ? passwordStrength.color : "var(--color-text-muted)" }}>
            {password ? `Password strength: ${passwordStrength.label}` : "Password strength"}
          </p>
        </div>
        {fieldErrors.password && (
          <p className="text-xs text-red-400">{fieldErrors.password}</p>
        )}
      </div>

      {/* Confirm Password */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Confirm Password</label>
        <input
          type={showPassword ? "text" : "password"}
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            setFieldErrors((p) => ({ ...p, confirm: null }));
          }}
          placeholder="••••••••"
          autoComplete="new-password"
          className={inputClass(fieldErrors.confirm)}
          style={{
            color: "var(--color-text)",
            background: "color-mix(in srgb, var(--color-surface) 88%, var(--color-background) 12%)",
            borderColor: fieldErrors.confirm ? "rgba(239,68,68,.45)" : "color-mix(in srgb, var(--color-text-muted) 28%, transparent)",
          }}
        />
        {fieldErrors.confirm && (
          <p className="text-xs text-red-400">{fieldErrors.confirm}</p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl py-3 font-semibold text-white text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: "linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 80%, white 20%), var(--color-accent))",
          boxShadow: "0 10px 24px color-mix(in srgb, var(--color-accent) 24%, transparent)",
        }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Creating account…
          </span>
        ) : (
          "Create Account"
        )}
      </button>

      {/* Switch */}
      <p className="text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-medium transition-colors"
          style={{ color: "var(--color-accent)" }}
        >
          Sign in
        </button>
      </p>
    </form>
  );
}