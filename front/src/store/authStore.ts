import axios from "axios";
import { create } from "zustand";

/** Login sem usar `services/api` para evitar dependência circular com o interceptor. */
const loginClient = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: { "Content-Type": "application/json" },
});

const LS_USER = "sdp_user";
const LS_ACTIVE_ROLE = "sdp_active_role";

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  roles: string[];
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

function loadUserFromStorage(): User | null {
  try {
    const raw = localStorage.getItem(LS_USER);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function userFromJwt(token: string): User | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const p = JSON.parse(json) as {
      id: number;
      roles: string[];
      courseId?: number;
      isSolicitant?: boolean;
    };
    if (!p?.roles?.length) return null;
    return {
      id: p.id,
      name: "",
      username: "",
      email: "",
      roles: p.roles,
      courseId: p.courseId,
      isSolicitant: p.isSolicitant,
    };
  } catch {
    return null;
  }
}

function initialUser(): User | null {
  const stored = loadUserFromStorage();
  if (stored) return stored;
  const token = localStorage.getItem("sdp_token");
  if (token) return userFromJwt(token);
  return null;
}

function initialActiveRole(u: User | null): string {
  const saved = localStorage.getItem(LS_ACTIVE_ROLE);
  if (saved && u?.roles?.includes(saved)) return saved;
  return u?.roles?.[0] ?? "";
}

const initialUserValue = initialUser();
const initialActiveRoleValue = initialActiveRole(initialUserValue);

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUserValue,
  token: localStorage.getItem("sdp_token"),
  activeRole: initialActiveRoleValue,
  isAuthenticated: !!localStorage.getItem("sdp_token"),

  login: async (email, password) => {
    try {
      const response = await loginClient.post("/login", { email, password });
      const { user, token } = response.data;

      localStorage.setItem("sdp_token", token);
      localStorage.setItem(LS_USER, JSON.stringify(user));
      const role = user.roles[0];
      localStorage.setItem(LS_ACTIVE_ROLE, role);

      set({
        user,
        token,
        isAuthenticated: true,
        activeRole: role,
      });
    } catch (error) {
      console.error("Erro de login:", error);
      throw error;
    }
  },

  switchRole: (role: string) => {
    localStorage.setItem(LS_ACTIVE_ROLE, role);
    set({ activeRole: role });
  },

  logout: () => {
    localStorage.removeItem("sdp_token");
    localStorage.removeItem(LS_USER);
    localStorage.removeItem(LS_ACTIVE_ROLE);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      activeRole: "",
    });
  },
}));
