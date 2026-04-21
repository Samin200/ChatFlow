import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import OnboardingPage from "./pages/OnboardingPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import { getSession } from "./services/authService.js";

/**
 * ProtectedRoute component
 * Redirects to /login if the user is not authenticated.
 */
function ProtectedRoute({ children }) {
  const session = getSession();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

/**
 * PublicRoute component
 * Redirects to / if the user is already authenticated.
 */
function PublicRoute({ children }) {
  const session = getSession();
  if (session) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <ChatPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/chat/:chatId",
    element: (
      <ProtectedRoute>
        <ChatPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/login",
    element: (
      <PublicRoute>
        <AuthPage mode="login" />
      </PublicRoute>
    ),
  },
  {
    path: "/signup",
    element: (
      <PublicRoute>
        <AuthPage mode="signup" />
      </PublicRoute>
    ),
  },
  {
    path: "/onboarding",
    element: (
      <ProtectedRoute>
        <OnboardingPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
