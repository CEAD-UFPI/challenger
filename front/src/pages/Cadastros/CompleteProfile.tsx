import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import api from "../../services/api";
import { CheckCircle2, AlertCircle, User, KeyRound } from "lucide-react";

export default function CompleteProfile() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token"); // Pega o token da URL
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const { register, handleSubmit } = useForm();

  const onSubmit = async (data: any) => {
    if (!token) {
      setMessage({
        type: "error",
        text: "Token de segurança ausente. Use o link exato enviado por e-mail.",
      });
      return;
    }

    if (data.password !== data.confirmPassword) {
      setMessage({ type: "error", text: "As senhas não coincidem." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Envia apenas o token e a nova senha para o backend
      await api.post("/users/completar-cadastro", {
        token,
        password: data.password,
      });

      setMessage({
        type: "success",
        text: "Senha criada com sucesso! Redirecionando para o login...",
      });

      // Redireciona para o Login após 3 segundos
      setTimeout(() => navigate("/"), 3000);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Link expirado ou inválido.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl flex items-center gap-3 font-bold shadow-sm border border-red-100">
          <AlertCircle /> Acesso Negado: Link de confirmação inválido ou
          ausente.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="text-center">
          <div className="mx-auto bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-4 text-white">
            <User size={32} />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">
            Ative sua Conta
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Defina uma senha segura para acessar o Challenger.
          </p>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 font-bold text-sm ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
            {message.type === "success" ? (
              <CheckCircle2 size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            {message.text}
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white py-8 px-10 shadow-xl shadow-slate-200/50 rounded-[2rem] border border-slate-100 space-y-8">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <KeyRound size={14} /> Segurança
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                  Criar Senha
                </label>
                <input
                  type="password"
                  required
                  {...register("password")}
                  className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                  Confirmar Senha
                </label>
                <input
                  type="password"
                  required
                  {...register("confirmPassword")}
                  className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white font-black py-4 rounded-xl shadow-xl hover:bg-indigo-600 transition-all flex justify-center uppercase tracking-widest text-xs disabled:opacity-50">
            {loading ? "Ativando Conta..." : "Criar Senha e Acessar"}
          </button>
        </form>
      </div>
    </div>
  );
}
