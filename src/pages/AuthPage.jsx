import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "../features/auth/LoginForm.jsx";
import SignupForm from "../features/auth/SignupForm.jsx";
import ChatFlowIcon from "../components/ChatFlowIcon.jsx";
import { useAuth } from "../hooks/useAuth.js";

export default function AuthPage({ mode: initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);
  const navigate = useNavigate();
  const {
    loading,
    error,
    clearError,
    handleLogin,
    handleSignup,
    handleGuestLogin,
  } = useAuth();

  // Sync internal state if the route prop changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  function handleSwitchToSignup() {
    clearError?.();
    navigate("/signup");
  }

  function handleSwitchToLogin() {
    clearError?.();
    navigate("/login");
  }

  async function onLogin(username, password) {
    const result = await handleLogin(username, password);
    if (result.success) {
      navigate("/");
    }
  }

  async function onSignup(username, password) {
    const result = await handleSignup(username, password);
    if (result.success) {
      navigate("/onboarding", { state: { pendingUser: result.user } });
    }
  }

  async function onGuestLogin() {
    const result = await handleGuestLogin();
    if (result.success) {
      navigate("/");
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Background glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: "color-mix(in srgb, var(--color-accent) 16%, transparent)" }} />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: "color-mix(in srgb, var(--color-primary) 14%, transparent)" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: "color-mix(in srgb, var(--color-secondary) 10%, transparent)" }} />

      {/* Card */}
      <div className="relative w-full max-w-md">
        {/* Glass card */}
        <div
          className="rounded-3xl backdrop-blur-2xl border shadow-2xl overflow-hidden"
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-surface) 88%, var(--color-background) 12%)",
            borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)",
            boxShadow: "0 30px 80px color-mix(in srgb, var(--color-background) 60%, black 40%)",
          }}
        >
          {/* Card top gradient line */}
          <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-accent) 60%, transparent), transparent)" }} />

          <div className="px-8 py-10">
            {/* Logo + header */}
            <div className="flex flex-col items-center gap-3 mb-8">
              <ChatFlowIcon className="h-14 w-14" />
              <div className="text-center">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  <span style={{ color: "var(--color-text)" }}>Chat</span>
                  <span style={{ color: "var(--color-accent)" }}>Flow</span>
                </h1>
                <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                  {mode === "login"
                    ? "Welcome back! Sign in to continue"
                    : "Create your account to get started"}
                </p>
              </div>
            </div>

            {/* Tab switcher */}
            <div className="flex rounded-xl border p-1 mb-6" style={{ backgroundColor: "color-mix(in srgb, var(--color-surface) 92%, transparent)", borderColor: "color-mix(in srgb, var(--color-text) 12%, transparent)" }}>
              <button
                onClick={handleSwitchToLogin}
                className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
                style={
                  mode === "login"
                    ? {
                        background: "linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 70%, white 30%), var(--color-accent))",
                        color: "#fff",
                        boxShadow: "0 10px 24px color-mix(in srgb, var(--color-accent) 24%, transparent)",
                      }
                    : { color: "var(--color-text-muted)" }
                }
              >
                Sign In
              </button>
              <button
                onClick={handleSwitchToSignup}
                className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
                style={
                  mode === "signup"
                    ? {
                        background: "linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 70%, white 30%), var(--color-accent))",
                        color: "#fff",
                        boxShadow: "0 10px 24px color-mix(in srgb, var(--color-accent) 24%, transparent)",
                      }
                    : { color: "var(--color-text-muted)" }
                }
              >
                Sign Up
              </button>
            </div>

            {/* Form */}
            <div className="transition-all duration-200">
              {mode === "login" ? (
                <LoginForm
                  onLogin={onLogin}
                  onSwitchToSignup={handleSwitchToSignup}
                  onGuestLogin={onGuestLogin}
                  loading={loading}
                  error={error}
                />
              ) : (
                <SignupForm
                  onSignup={onSignup}
                  onSwitchToLogin={handleSwitchToLogin}
                  onGuestLogin={onGuestLogin}
                  loading={loading}
                  error={error}
                />
              )}
            </div>
          </div>

          {/* Bottom gradient line */}
          <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-primary) 45%, transparent), transparent)" }} />
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-4" style={{ color: "var(--color-text-muted)" }}>
          Your data is stored locally on this device
        </p>
      </div>
    </div>
  );
}
