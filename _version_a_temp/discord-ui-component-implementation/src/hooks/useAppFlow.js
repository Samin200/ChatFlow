/**
 * useAppFlow.js
 * Controls the top-level state machine: "auth" | "onboarding" | "chat"
 * This is the single source of truth for which page is rendered.
 */

import { useState, useCallback } from "react";
import { getSession } from "../services/authService.js";

const FLOWS = {
  AUTH: "auth",
  ONBOARDING: "onboarding",
  CHAT: "chat",
};

function resolveInitialFlow() {
  const session = getSession();
  if (!session) return FLOWS.AUTH;
  // If user exists but has no displayName fully set, still go to chat
  // (onboarding is only triggered explicitly after signup)
  return FLOWS.CHAT;
}

export function useAppFlow() {
  const [flow, setFlow] = useState(resolveInitialFlow);
  // Carries transient data between flows (e.g., newly signed-up user)
  const [flowData, setFlowData] = useState(null);

  const goToAuth = useCallback(() => {
    setFlowData(null);
    setFlow(FLOWS.AUTH);
  }, []);

  const goToOnboarding = useCallback((data) => {
    setFlowData(data ?? null);
    setFlow(FLOWS.ONBOARDING);
  }, []);

  const goToChat = useCallback((data) => {
    setFlowData(data ?? null);
    setFlow(FLOWS.CHAT);
  }, []);

  return {
    flow,
    flowData,
    isAuth: flow === FLOWS.AUTH,
    isOnboarding: flow === FLOWS.ONBOARDING,
    isChat: flow === FLOWS.CHAT,
    goToAuth,
    goToOnboarding,
    goToChat,
  };
}
