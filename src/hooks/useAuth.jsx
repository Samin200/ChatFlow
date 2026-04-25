/**
 * useAuth.jsx
 * Manages authentication state for the current user session.
 * Exports AuthProvider for global state management.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { generateId } from "../utils/helpers.js";
import { registerPushNotifications } from "../services/notificationService.js";
import {
  login,
  signup,
  logout,
  getSession,
  persistSession,
  updateProfile,
} from "../services/authService.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [storageOk, setStorageOk] = useState(true);

  useEffect(() => {
    try {
      const session = getSession();
      if (session) {
        setUser(session);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      registerPushNotifications();
    }
  }, [user?.id]);

  const clearError = useCallback(() => setError(null), []);

  const handleLogin = useCallback(async (username, password) => {
    setError(null);
    setLoading(true);
    try {
      const result = await login(username, password);
      if (!result.success) {
        setError(result.error);
        return result;
      }
      setUser(result.user);
      return result;
    } catch (err) {
      const msg = err?.message || "Login failed.";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSignup = useCallback(async (username, password) => {
    setError(null);
    setLoading(true);
    try {
      const result = await signup(username, password);
      if (!result.success) {
        setError(result.error);
        return result;
      }
      return result;
    } catch (err) {
      const msg = err?.message || "Signup failed.";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    setUser(null);
    setError(null);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const finalizeUser = useCallback((fullUser) => {
    persistSession(fullUser);
    setUser(fullUser);
  }, []);

  const handleGuestLogin = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const guestUser = {
        id: generateId(),
        username: `guest_${Date.now().toString(36)}`,
        displayName: "Guest",
        avatar: null,
        isGuest: true,
        createdAt: new Date().toISOString(),
      };
      persistSession(guestUser);
      setUser(guestUser);
      return { success: true, user: guestUser };
    } catch (err) {
      const msg = err?.message || "Guest login failed.";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUpdateProfile = useCallback(async (patch) => {
    if (!user?.id) {
      return { success: false, error: "No active session." };
    }

    const result = await updateProfile(user.id, patch);
    if (!result.success) {
      setError(result.error);
      return result;
    }

    setError(null);
    setUser(result.user);
    return result;
  }, [user]);

  const value = {
    user,
    loading,
    error,
    storageOk,
    clearError,
    handleLogin,
    handleSignup,
    handleLogout,
    handleGuestLogin,
    handleUpdateProfile,
    updateUser,
    finalizeUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
