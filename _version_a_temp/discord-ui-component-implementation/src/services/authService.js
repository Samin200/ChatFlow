/**
 * authService.js
 * Handles all authentication logic.
 * Reads/writes via storageService only.
 */

import {
  getAuthUser,
  getAuthToken,
  setAuthUser,
  setAuthToken,
  clearAuthUser,
  clearAuthToken,
  getChatUsers,
  upsertChatUser,
  setProfilePicture,
} from "./storageService.js";
import { generateId } from "../utils/helpers.js";
import api from "./api.js";
import { disconnectSocket } from "./socketService.js";

const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === "true";

function getErrorMessage(error, fallback = "Something went wrong.") {
  return error?.response?.data?.message || error?.message || fallback;
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(username, password) {
  if (USE_BACKEND) {
    try {
      const { data } = await api.post("/api/auth/login", { username, password });
      const token = data?.token || data?.data?.token || null;
      const user = data?.user || data?.data?.user || null;

      if (!token || !user) {
        return { success: false, error: "Login failed — invalid response." };
      }

      const normalizedUser = { ...user, token };
      const ok = persistSession(normalizedUser);
      if (!ok) {
        return { success: false, error: "Storage error — could not save session." };
      }

      return { success: true, user: normalizedUser };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, "Login failed.") };
    }
  }

  const users = getChatUsers();
  const normalizedUsername = String(username ?? "").trim().toLowerCase();
  const found = users.find(
    (u) => String(u?.username ?? "").toLowerCase() === normalizedUsername
  );

  if (!found) {
    return { success: false, error: "No account found with that username." };
  }
  if (found.password !== password) {
    return { success: false, error: "Incorrect password." };
  }

  const ok = setAuthUser(found);
  if (!ok) {
    return { success: false, error: "Storage error — could not save session." };
  }

  clearAuthToken();

  return { success: true, user: found };
}

// ─── Signup ───────────────────────────────────────────────────────────────────

export async function signup(username, password) {
  if (USE_BACKEND) {
    try {
      const { data } = await api.post("/api/auth/register", {
        username: username.trim(),
        password,
      });
      const token = data?.token || data?.data?.token || null;
      const user = data?.user || data?.data?.user || null;

      if (!token || !user) {
        return { success: false, error: "Signup failed — invalid response." };
      }

      const normalizedUser = { ...user, token };
      persistSession(normalizedUser);

      return { success: true, user: normalizedUser };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, "Signup failed.") };
    }
  }

  const users = getChatUsers();
  const normalizedUsername = String(username ?? "").trim().toLowerCase();
  const exists = users.find(
    (u) => String(u?.username ?? "").toLowerCase() === normalizedUsername
  );

  if (exists) {
    return { success: false, error: "Username already taken. Choose another." };
  }

  const newUser = {
    id: generateId(),
    username: username.trim(),
    password,
    displayName: username.trim(),
    avatar: null,
    isGuest: false,
    createdAt: new Date().toISOString(),
  };

  const savedUsers = upsertChatUser(newUser);
  if (!savedUsers) {
    return { success: false, error: "Storage error — could not create account." };
  }

  // Don't set auth yet — user must complete onboarding
  return { success: true, user: newUser };
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export function logout() {
  disconnectSocket();
  clearAuthUser();
  clearAuthToken();
}

// ─── Session ──────────────────────────────────────────────────────────────────

export function getSession() {
  const user = getAuthUser();
  const token = getAuthToken();
  if (!user) return null;
  if (!token) return user;
  return user.token ? user : { ...user, token };
}

export function persistSession(user) {
  const sessionSaved = setAuthUser(user);
  if (!sessionSaved) return false;
  if (user?.token) {
    setAuthToken(user.token);
  }
  if (user && typeof user === "object" && Object.prototype.hasOwnProperty.call(user, "avatar")) {
    setProfilePicture(user.avatar ?? "");
  }
  return true;
}

export async function updateProfile(userId, patch) {
  if (!userId) {
    return { success: false, error: "Missing user id." };
  }

  if (USE_BACKEND) {
    try {
      const { data } = await api.post("/api/auth/profile", patch);
      const updatedUser = data?.user || data?.data?.user;
      if (!updatedUser) return { success: false, error: "Profile update failed." };
      
      const session = getSession();
      const userWithToken = { ...updatedUser, token: session?.token };
      persistSession(userWithToken);
      
      return { success: true, user: userWithToken };
    } catch (error) {
      return { success: false, error: getErrorMessage(error, "Failed to update profile.") };
    }
  }

  const users = getChatUsers();
  const found = users.find((user) => user.id === userId);
  if (!found) {
    return { success: false, error: "User not found." };
  }

  const cleanedPatch = {
    displayName: typeof patch.displayName === "string" ? patch.displayName.trim() : found.displayName,
    avatar: patch.avatar ?? null,
    about: typeof patch.about === "string" ? patch.about.trim() : found.about ?? "",
  };

  const updatedUser = {
    ...found,
    ...cleanedPatch,
    updatedAt: new Date().toISOString(),
  };

  const usersSaved = upsertChatUser(updatedUser);
  if (!usersSaved) {
    return { success: false, error: "Storage error - could not update profile." };
  }

  const profileSaved = setProfilePicture(updatedUser.avatar ?? "");
  if (!profileSaved) {
    return { success: false, error: "Storage error - could not cache profile picture." };
  }

  const currentSession = getAuthUser();
  if (currentSession?.id === userId) {
    const sessionSaved = setAuthUser(updatedUser);
    if (!sessionSaved) {
      return { success: false, error: "Storage error - could not update session." };
    }
  }

  return { success: true, user: updatedUser };
}
