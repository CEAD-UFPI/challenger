import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import api from "../../services/api";
import {
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  KeyRound,
} from "lucide-react";

export default function CompleteProfile() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token"); // Pega o token gigante da URL
  const navigate = useNavigate();

  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const { register, handleSubmit } = useForm();

  // Carrega os bancos para o Select
  useEffect(() => {
    api
      .get("/bancos")
      .then((res) => setBanks(res.data))
      .catch((err) => console.error("Erro ao carregar bancos", err));
  }, []);

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
      await api.post("/users/completar-cadastro", {
        token,
        password: data.password,
        telefone: data.telefone,
        cep: data.cep,
        endereco: data.endereco,
        bancoId: data.bancoId,
        agencia: data.agencia,
        conta: data.conta,
      });

      setMessage({
        type: "success",
        text: "Perfil ativado com sucesso! Redirecionando para o login...",
      });

      // Joga o usuário para o Login após 3 segundos
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
      <div className="w-full max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="text-center">
          <div className="mx-auto bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-4 text-white">
            <User size={32} />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">
            Complete seu Cadastro
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Defina sua senha e preencha os dados operacionais para ativar sua
            conta no Challenger.
          </p>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 font-bold text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
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
          {/* Seção 1: Senha */}
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <KeyRound size={14} /> Segurança
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <hr className="border-slate-100" />

          {/* Seção 2: Contato e Endereço */}
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
              Contato & Endereço
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                  Telefone / Celular
                </label>
                <input
                  required
                  {...register("telefone")}
                  placeholder="(00) 00000-0000"
                  className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                  CEP
                </label>
                <input
                  required
                  {...register("cep")}
                  placeholder="00000-000"
                  className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                Endereço Completo
              </label>
              <input
                required
                {...register("endereco")}
                placeholder="Rua, Número, Bairro, Cidade - UF"
                className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Seção 3: Dados Bancários */}
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Building size={14} /> Dados Bancários
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                  Banco
                </label>
                <select
                  required
                  {...register("bancoId")}
                  className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                  <option value="">Selecione o seu banco...</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                  Agência
                </label>
                <input
                  required
                  {...register("agencia")}
                  className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                  Conta (com dígito)
                </label>
                <input
                  required
                  {...register("conta")}
                  className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white font-black py-4 rounded-xl shadow-xl hover:bg-indigo-600 transition-all flex justify-center uppercase tracking-widest text-xs disabled:opacity-50">
            {loading
              ? "Salvando Perfil..."
              : "Finalizar Cadastro e Ativar Conta"}
          </button>
        </form>
      </div>
    </div>
  );
}
