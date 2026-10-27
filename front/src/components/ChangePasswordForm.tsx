import { KeyRound, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import api from "../services/api";

export default function ChangePasswordForm() {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (novaSenha.length < 6) {
      return setMessage({ type: "error", text: "A nova senha deve ter ao menos 6 caracteres." });
    }
    if (novaSenha !== confirmacao) {
      return setMessage({ type: "error", text: "A confirmação não confere com a nova senha." });
    }

    setSaving(true);
    try {
      await api.put("/me/senha", { senhaAtual, novaSenha });
      setMessage({ type: "success", text: "Senha alterada com sucesso!" });
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmacao("");
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.error || "Erro ao alterar a senha." });
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
        <KeyRound size={14} /> Alterar Senha
      </h3>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-bold ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Senha atual</label>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nova senha</label>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
            Confirmar nova senha
          </label>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="bg-slate-900 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-600 transition-all flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="animate-spin" size={20} /> : <KeyRound size={20} />}
          {saving ? "Alterando..." : "Alterar Senha"}
        </button>
      </div>
    </form>
  );
}
