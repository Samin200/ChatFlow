import { useState } from "react";
import { validateUsername, validatePassword } from "../../utils/helpers.js";
import Swal from "sweetalert2";

export default function LoginForm({ onLogin, onSwitchToSignup, onGuestLogin, loading, error }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotWhatsapp, setForgotWhatsapp] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  function validate() {
    const errors = {};
    const u = validateUsername(username);
    const p = validatePassword(password);
    if (u) errors.username = u;
    if (p) errors.password = p;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    onLogin(username.trim(), password);
  }

  async function handleForgotSubmit(e) {
    e.preventDefault();
    if (!forgotUsername.trim() || !forgotWhatsapp.trim()) return;

    try {
      setForgotLoading(true);
      await fetch(`${import.meta.env.VITE_API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: forgotUsername.trim(),
          whatsapp: forgotWhatsapp.trim(),
        }),
      });
    } finally {
      setForgotLoading(false);
      setShowForgot(false);
      setForgotUsername("");
      setForgotWhatsapp("");
      await Swal.fire({
        icon: "success",
        title: "Request sent to admin. You will be notified soon.",
        timer: 1800,
        showConfirmButton: false,
        background: "var(--color-surface)",
        color: "var(--color-text)",
      });
    }
  }

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
            setFieldErrors((prev) => ({ ...prev, username: null }));
          }}
          placeholder="your_username"
          autoComplete="username"
          className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all placeholder-[color:var(--color-text-muted)] ${
            fieldErrors.username ? "border-red-500/50" : ""
          }`}
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
              setFieldErrors((prev) => ({ ...prev, password: null }));
            }}
            placeholder="••••••••"
            autoComplete="current-password"
            className={`w-full rounded-xl border px-4 py-3 pr-12 text-sm outline-none transition-all placeholder-[color:var(--color-text-muted)] ${
              fieldErrors.password ? "border-red-500/50" : ""
            }`}
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
        {fieldErrors.password && (
          <p className="text-xs text-red-400">{fieldErrors.password}</p>
        )}
        
        <div className="flex justify-end mt-1">
          <button
            type="button"
            onClick={() => setShowForgot(true)}
            className="text-xs font-medium"
            style={{ color: "var(--color-accent)" }}
          >
            Forgot Password?
          </button>
        </div>
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
            Signing in…
          </span>
        ) : (
          "Sign In"
        )}
      </button>

      {/* Switch */}
      <p className="text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
        Don't have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="font-medium transition-colors"
          style={{ color: "var(--color-accent)" }}
        >
          Sign up
        </button>
      </p>

      {showForgot && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60">
          <form
            onSubmit={handleForgotSubmit}
            className="w-full max-w-md rounded-2xl border p-5 space-y-4"
            style={{
              background: "var(--color-surface)",
              borderColor: "color-mix(in srgb, var(--color-text-muted) 25%, transparent)",
            }}
          >
            <h3 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
              Forgot Password
            </h3>
            <div className="space-y-1">
              <label className="text-sm" style={{ color: "var(--color-text)" }}>Username</label>
              <input
                type="text"
                value={forgotUsername}
                onChange={(e) => setForgotUsername(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
                style={{
                  background: "color-mix(in srgb, var(--color-surface) 88%, var(--color-background) 12%)",
                  borderColor: "color-mix(in srgb, var(--color-text-muted) 28%, transparent)",
                  color: "var(--color-text)",
                }}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm" style={{ color: "var(--color-text)" }}>WhatsApp Number</label>
              <input
                type="text"
                value={forgotWhatsapp}
                onChange={(e) => setForgotWhatsapp(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
                style={{
                  background: "color-mix(in srgb, var(--color-surface) 88%, var(--color-background) 12%)",
                  borderColor: "color-mix(in srgb, var(--color-text-muted) 28%, transparent)",
                  color: "var(--color-text)",
                }}
                required
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="px-4 py-2 rounded-lg"
                style={{ color: "var(--color-text-muted)" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={forgotLoading}
                className="px-4 py-2 rounded-lg font-medium text-white"
                style={{ background: "var(--color-accent)" }}
              >
                {forgotLoading ? "Sending..." : "Submit"}
              </button>
            </div>
          </form>
        </div>
      )}
    </form>
  );
}