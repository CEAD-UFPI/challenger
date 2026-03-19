import { Lock, User } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function Login() {
  const { login, user } = useAuthStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/app");
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError("Acesso negado. Verifique suas credenciais.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4 animate-in fade-in duration-700">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-purple-600"></div>

        <div className="text-center mb-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 shadow-inner">
            {/* Coloque seu logo.png na pasta public */}
            <img
              src="/brand.png"
              alt="Logo"
              className="h-12 object-contain"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-1">
            CHALLENGER
          </h1>
          <p className="text-slate-400 font-medium text-xs tracking-widest uppercase">
            Gestão Inteligente de Viagens
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Login
            </label>
            <div className="relative group">
              <User
                className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors"
                size={20}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all font-medium text-slate-700"
                placeholder="usuario@instituicao.edu.br"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Senha
              </label>
              <a
                href="#"
                className="text-[10px] font-bold text-blue-600 hover:underline">
                Recuperar Senha?
              </a>
            </div>
            <div className="relative group">
              <Lock
                className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors"
                size={20}
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all font-medium text-slate-700"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg text-center border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-slate-200 hover:shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wider text-sm mt-4">
            {loading ? "Autenticando..." : "Entrar na Plataforma"}
          </button>
        </form>
      </div>
    </div>
  );
}
