import axios from "axios";
import { useAuthStore } from "../store/authStore"; // Importamos a sua store

const api = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// --- 1. INTERCEPTOR DE REQUISIÇÃO (O "Entregador de Crachá") ---
// Antes de qualquer chamada para a API, ele roda esse código
api.interceptors.request.use((config) => {
  // Evita dependência circular authStore ↔ api: fallback ao localStorage
  const token =
    useAuthStore.getState().token ?? localStorage.getItem("sdp_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// --- 2. INTERCEPTOR DE RESPOSTA ---
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== "/") {
        window.location.assign("/?sessao=expirada");
      }
      return Promise.reject(error);
    }
    console.error("[API Error]:", error.response?.data || error.message);
    return Promise.reject(error);
  },
);

export default api;
