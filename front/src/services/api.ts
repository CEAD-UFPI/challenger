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
  // Pega o token diretamente do estado global
  const token = useAuthStore.getState().token;

  if (token) {
    // Se tiver token, anexa no cabeçalho de Autorização
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// --- 2. INTERCEPTOR DE RESPOSTA (O seu tratamento de erro global) ---
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Se der 401, o token pode ter expirado. Podemos até forçar o logout aqui depois!
    console.error("[API Error]:", error.response?.data || error.message);
    return Promise.reject(error);
  },
);

export default api;
