import axios from "axios";

const API_BASE_URL = "/api";

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// In-memory token storage (since localStorage is not supported in Claude.ai artifacts)
let accessToken: string | null = null;
let refreshToken: string | null = null;

// Request interceptor to add auth header
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && refreshToken) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken: newAccessToken } = response.data;
        accessToken = newAccessToken;

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        logout();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth functions
export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  console.log("Tokens set in memory (localStorage not available in this environment)");
}

export function logout() {
  accessToken = null;
  refreshToken = null;
  console.log("Tokens cleared from memory");
}

export function getAccessToken() {
  return accessToken;
}

// API request wrapper for React Query
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<any> {
  const response = await api.request({
    method,
    url,
    data,
  });
  return response.data;
}

export async function searchAirports(query: string) {
  return apiRequest("GET", `/airports/search?q=${encodeURIComponent(query)}`);
}

// Get airports near a location (lat, lon, radius in km)
export async function airportsByLocation(lat: number, lon: number, radius: number = 100) {
  return apiRequest("GET", `/airports/location?lat=${lat}&lon=${lon}&radius=${radius}`);
}

// Get detailed airport info by ICAO/IATA code
export async function airportByCode(code: string) {
  return apiRequest("GET", `/airports/code/${code}`);
}