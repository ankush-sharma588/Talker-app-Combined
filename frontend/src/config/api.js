/**
 * Shared axios instance.
 *
 * Replaces bare `axios.get("/api/...")` calls (which only worked through the
 * CRA dev proxy) with requests against an explicit baseURL that works in the
 * packaged Android app, in production web, and in local development alike.
 *
 * Every file that previously did `import axios from "axios"` and called
 * axios.get("/api/...") has been updated to `import api from "../config/api"`
 * (path depth varies by file) and call `api.get("/api/...")` instead.
 */
import axios from "axios";
import { API_URL } from "./env";

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Centralized auth handling: if a token has expired/is invalid, every screen
// that calls the API behaves consistently instead of each component needing
// its own 401 handling.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("userInfo");
      if (window.location.pathname !== "/") {
        window.location.assign("/");
      }
    }
    return Promise.reject(error);
  }
);

export default api;
