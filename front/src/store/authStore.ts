import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../services/api";

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  roles: string[];
  courseId?: number | null;
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

// Usuário, token e perfil ativo são persistidos para sobreviver ao recarregar a página
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      activeRole: "",
      isAuthenticated: false,

      login: async (email, password) => {
        const response = await api.post("/login", { email, password });
        const { user, token } = response.data;
        set({
          user,
          token,
          isAuthenticated: true,
          activeRole: user.roles[0] ?? "",
        });
      },

      switchRole: (role: string) => set({ activeRole: role }),

      logout: () => set({ user: null, token: null, isAuthenticated: false, activeRole: "" }),
    }),
    {
      name: "sdp_auth",
      // Sessões antigas (só com token, sem usuário) são descartadas
      merge: (persisted, current) => {
        const p = persisted as Partial<AuthState> | undefined;
        return p?.token && p?.user ? { ...current, ...p } : current;
      },
    },
  ),
);

// Remove a chave antiga usada antes da persistência completa
localStorage.removeItem("sdp_token");
