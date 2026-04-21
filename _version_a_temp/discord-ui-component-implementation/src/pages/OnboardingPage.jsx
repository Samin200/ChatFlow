import { useLocation, useNavigate } from "react-router-dom";
import OnboardingFlow from "../features/onboarding/OnboardingFlow.jsx";
import ChatFlowIcon from "../components/ChatFlowIcon.jsx";
import { useAuth } from "../hooks/useAuth.js";

export default function OnboardingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { finalizeUser } = useAuth();
  
  // pendingUser can come from navigation state (after signup)
  const pendingUser = location.state?.pendingUser;

  function onOnboardingComplete(finalUser) {
    finalizeUser(finalUser);
    navigate("/", { replace: true });
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundColor: "var(--color-background)",
        backgroundImage:
          "radial-gradient(circle at 20% 10%, color-mix(in srgb, var(--color-accent) 14%, transparent), transparent 45%), radial-gradient(circle at 80% 90%, color-mix(in srgb, var(--color-primary) 12%, transparent), transparent 40%)",
      }}
    >
      {/* Background glows */}
      <div
        className="absolute top-0 right-1/4 w-80 h-80 rounded-full blur-3xl pointer-events-none"
        style={{ background: "color-mix(in srgb, var(--color-accent) 18%, transparent)" }}
      />
      <div
        className="absolute bottom-0 left-1/4 w-80 h-80 rounded-full blur-3xl pointer-events-none"
        style={{ background: "color-mix(in srgb, var(--color-primary) 15%, transparent)" }}
      />

      <div className="relative w-full max-w-sm">
        <div
          className="rounded-3xl backdrop-blur-2xl shadow-2xl overflow-hidden"
          style={{
            background: "color-mix(in srgb, var(--color-surface) 90%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-text-muted) 28%, transparent)",
            boxShadow: "0 20px 48px color-mix(in srgb, var(--color-background) 68%, black 32%)",
          }}
        >
          <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-accent) 60%, transparent), transparent)" }} />

          <div className="px-8 py-10">
            {/* Header */}
            <div className="flex flex-col items-center gap-2 mb-8">
              <ChatFlowIcon className="h-12 w-12" />
              <div className="text-center">
                <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
                  Set up your profile
                </h1>
                <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                  Just a couple of quick steps
                </p>
              </div>
            </div>

            <OnboardingFlow pendingUser={pendingUser} onComplete={onOnboardingComplete} />
          </div>

          <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-primary) 40%, transparent), transparent)" }} />
        </div>
      </div>
    </div>
  );
}