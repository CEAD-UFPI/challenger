import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import api from "../services/api";
import { CheckCircle2, AlertCircle, KeyRound, ShieldAlert } from "lucide-react";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const { register, handleSubmit } = useForm();

  const onSubmit = async (data: any) => {
    if (data.password !== data.confirmPassword) {
      setMessage({ type: "error", text: "As senhas não coincidem." });
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        token,
        password: data.password,
      });
      setMessage({
        type: "success",
        text: "Senha atualizada! Redirecionando...",
      });
      setTimeout(() => navigate("/"), 2000);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: "Erro ao redefinir. O link pode ter expirado.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
        <div className="text-center mb-8">
          <div className="mx-auto bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg">
            <ShieldAlert size={24} />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Nova Senha</h2>
          <p className="text-sm text-slate-500">
            Digite sua nova senha de acesso.
          </p>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl mb-6 flex items-center gap-3 text-sm font-bold ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {message.type === "success" ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input
            type="password"
            {...register("password")}
            placeholder="Nova Senha"
            required
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            {...register("confirmPassword")}
            placeholder="Confirme a Senha"
            required
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-blue-600 transition-all uppercase tracking-widest text-xs">
            {loading ? "Processando..." : "Redefinir Senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
