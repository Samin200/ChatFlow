import axios from "axios";
import { getAuthToken } from "./storageService.js";

let authToken = null;

export const setApiToken = (token) => {
  authToken = token || null;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = authToken || getAuthToken();

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
