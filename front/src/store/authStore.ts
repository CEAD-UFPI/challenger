import { create } from "zustand";
import api from "../services/api";

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  roles: string[];
  // Novos campos vindos do Backend
  courseId?: number;
  isSolicitant?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  activeRole: string;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  switchRole: (role: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  // Tenta recuperar token salvo. Se você quisesse persistir o usuário completo,
  // precisaria usar persist middleware ou salvar user no localStorage também.
  // Por simplificação, vamos confiar que o login preenche o user.
  token: localStorage.getItem("sdp_token"),
  activeRole: "",
  isAuthenticated: !!localStorage.getItem("sdp_token"),

  login: async (email, password) => {
    try {
      const response = await api.post("/login", { email, password });
      const { user, token } = response.data;

      localStorage.setItem("sdp_token", token);

      set({
        user,
        token,
        isAuthenticated: true,
        activeRole: user.roles[0],
      });
    } catch (error) {
      console.error("Erro de login:", error);
      throw error;
    }
  },

  switchRole: (role: string) => set({ activeRole: role }),

  logout: () => {
    localStorage.removeItem("sdp_token");
    set({ user: null, token: null, isAuthenticated: false, activeRole: "" });
  },
}));
