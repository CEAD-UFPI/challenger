import axios from "axios";
import { useAuthStore } from "../store/authStore";

const api = axios.create({
  // Defina VITE_API_URL no .env do frontend (ex.: https://servidor/api)
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Anexa o token do usuário logado em todas as requisições
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Sessão expirada/inválida: encerra a sessão e volta para o login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginCall = error.config?.url?.endsWith("/login");
    if (error.response?.status === 401 && !isLoginCall && useAuthStore.getState().token) {
      useAuthStore.getState().logout();
      window.location.href = "/";
    }
    console.error("[API Error]:", error.response?.data || error.message);
    return Promise.reject(error);
  },
);

export default api;
