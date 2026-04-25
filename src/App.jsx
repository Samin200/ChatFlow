/**
 * App.jsx
 * Use RouterProvider to inject the centralized routing logic.
 */

import { RouterProvider } from "react-router-dom";
import { router } from "./router.jsx";
import { AuthProvider } from "./hooks/useAuth.jsx";
import { CallProvider } from "./providers/CallProvider.jsx";

export default function App() {
  return (
    <AuthProvider>
      <CallProvider>
        <RouterProvider router={router} />
      </CallProvider>
    </AuthProvider>
  );
}