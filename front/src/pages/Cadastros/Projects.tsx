import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import api from "../../services/api";
import {
  Plus,
  Trash2,
  Briefcase,
  Calendar,
  Wallet,
  Edit2,
  Landmark,
} from "lucide-react";

export default function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const { register, handleSubmit, reset, setValue } = useForm();
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadProjects = async () => {
    try {
      const response = await api.get("/projetos");
      setProjects(response.data);
    } catch (e) {
      console.error("Erro ao carregar projetos:", e);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setValue("nomeDoProjeto", p.nomeDoProjeto);
    setValue("numTed", p.numTed);
    setValue("contaCorrente", p.contaCorrente);
    setValue("saldo", p.saldo);
    setValue("dtInicial", new Date(p.dtInicial).toISOString().split("T")[0]);
    setValue("dtFinal", new Date(p.dtFinal).toISOString().split("T")[0]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        dtInicial: new Date(data.dtInicial),
        dtFinal: new Date(data.dtFinal),
        saldo: parseFloat(data.saldo),
      };

      if (editingId) {
        await api.put(`/projetos/${editingId}`, payload);
      } else {
        await api.post("/projetos", payload);
      }

      reset();
      setEditingId(null);
      loadProjects();
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar projeto.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Deseja realmente excluir este projeto?")) {
      try {
        await api.delete(`/projetos/${id}`);
        loadProjects();
      } catch (e) {
        alert("Erro ao excluir.");
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-lg">
          <Briefcase size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Gestão de Projetos
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Cadastre e gerencie os orçamentos e TEDs.
          </p>
        </div>
      </div>

      {/* FORMULÁRIO */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
              Nome do Projeto
            </label>
            <input
              {...register("nomeDoProjeto")}
              className="w-full px-5 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
              placeholder="Ex: Projeto Pesquisa X"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
              Número TED
            </label>
            <input
              {...register("numTed")}
              className="w-full px-5 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
              placeholder="000/2024"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
              Conta Corrente
            </label>
            <input
              {...register("contaCorrente")}
              className="w-full px-5 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium font-mono"
              placeholder="00000-0"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
              Data Inicial
            </label>
            <input
              type="date"
              {...register("dtInicial")}
              className="w-full px-5 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
              Data Final
            </label>
            <input
              type="date"
              {...register("dtFinal")}
              className="w-full px-5 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
              Saldo Inicial (R$)
            </label>
            <input
              type="number"
              step="0.01"
              {...register("saldo")}
              className="w-full px-5 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-700"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                reset();
              }}
              className="bg-slate-100 text-slate-600 font-bold py-3 px-8 rounded-xl hover:bg-slate-200 transition-all">
              Cancelar
            </button>
          )}
          <button
            disabled={loading}
            className="bg-blue-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-slate-900 transition-all flex items-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50">
            <Plus size={18} />{" "}
            {editingId ? "Atualizar Projeto" : "Cadastrar Projeto"}
          </button>
        </div>
      </form>

      {/* LISTAGEM DE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((p) => (
          <div
            key={p.id}
            className="bg-white p-6 rounded-[2rem] border border-slate-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-50/50 transition-all relative group">
            <div className="absolute top-5 right-5 flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
              <button
                onClick={() => handleEdit(p)}
                className="p-2 bg-white shadow-md rounded-lg text-blue-500 hover:bg-blue-500 hover:text-white transition-all">
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleDelete(p.id)}
                className="p-2 bg-white shadow-md rounded-lg text-red-400 hover:bg-red-500 hover:text-white transition-all">
                <Trash2 size={16} />
              </button>
            </div>

            <div className="mb-4">
              <h3 className="font-black text-slate-800 text-lg leading-tight mb-1">
                {p.nomeDoProjeto}
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded uppercase tracking-widest">
                  TED: {p.numTed}
                </span>
                <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1">
                  <Landmark size={10} /> {p.contaCorrente}
                </span>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar size={14} />
                  <span className="text-xs font-bold">
                    {new Date(p.dtInicial).toLocaleDateString()}
                  </span>
                </div>
                <div className="h-1 w-4 bg-slate-200 rounded-full"></div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-xs font-bold">
                    {new Date(p.dtFinal).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Saldo Disponível
                </span>
                <div className="flex items-center gap-1 text-slate-800 font-black">
                  <Wallet size={14} className="text-emerald-500" />
                  <span>
                    R${" "}
                    {Number(p.saldo).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
