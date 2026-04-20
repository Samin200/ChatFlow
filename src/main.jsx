import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { initializeAppTheme } from "./utils/appTheme.js";

// Rebrand Migration - ensures existing users stay logged in.
const migrate = (oldKey, newKey) => {
  const oldVal = localStorage.getItem(oldKey);
  if (oldVal && !localStorage.getItem(newKey)) {
    localStorage.setItem(newKey, oldVal);
  }
};
['chatflow_token', 'kothaboli_token', 'auth_token', 'token'].forEach(k => migrate(k, 'nChatFlow_token'));
['chatflow_user', 'kothaboli_user', 'auth_user', 'user'].forEach(k => migrate(k, 'nChatFlow_user'));

// Apply stored app theme before React mounts to avoid first-paint flicker.
initializeAppTheme();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);