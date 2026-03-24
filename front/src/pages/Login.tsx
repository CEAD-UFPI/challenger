import { Lock, User, ArrowLeft, Mail, Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import api from "../services/api";

export default function Login() {
  const { login, user } = useAuthStore();
  const navigate = useNavigate();

  // Estados de navegação interna
  const [isForgotMode, setIsForgotMode] = useState(false);

  // Estados do formulário
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
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

  // Função para recuperar senha
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      await api.post("/auth/forgot-password", { email });
      setSuccessMsg(
        "Se este e-mail estiver cadastrado, você receberá um link em instantes.",
      );
      // Limpa o campo após sucesso
      setEmail("");
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao solicitar recuperação.");
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
            {isForgotMode
              ? "Recuperação de Acesso"
              : "Gestão Inteligente de Viagens"}
          </p>
        </div>

        {/* MENSAGENS DE FEEDBACK */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg text-center border border-red-100">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg text-center border border-emerald-100">
            {successMsg}
          </div>
        )}

        {!isForgotMode ? (
          /* FORMULÁRIO DE LOGIN */
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Login (E-mail)
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
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotMode(true);
                    setError("");
                    setSuccessMsg("");
                  }}
                  className="text-xs font-bold text-blue-600 hover:underline">
                  Esqueci minha senha
                </button>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition-all shadow-xl disabled:opacity-70 uppercase tracking-wider text-sm mt-4 flex justify-center items-center gap-2">
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                "Entrar na Plataforma"
              )}
            </button>
          </form>
        ) : (
          /* FORMULÁRIO DE ESQUECI SENHA */
          <form
            onSubmit={handleForgotPassword}
            className="space-y-5 animate-in slide-in-from-right-4 duration-300">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                E-mail para Recuperação
              </label>
              <div className="relative group">
                <Mail
                  className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors"
                  size={20}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all font-medium text-slate-700"
                  placeholder="Seu e-mail cadastrado"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-xl disabled:opacity-70 uppercase tracking-wider text-sm flex justify-center items-center gap-2">
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                "Enviar Link de Acesso"
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsForgotMode(false)}
              className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft size={14} /> Voltar para o Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
