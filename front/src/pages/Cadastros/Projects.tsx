import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { formatMoneyBRL } from "../../utils/formatMoney";
import { Plus, Trash2, Briefcase, Calendar, Wallet, ExternalLink } from "lucide-react";

export default function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const { register, handleSubmit, reset } = useForm();
  const [loading, setLoading] = useState(false);

  const loadProjects = async () => {
    try {
      setProjects((await api.get("/projetos")).data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      // Conversão de tipos necessária para o Prisma Decimal/DateTime
      const payload = {
        ...data,
        dtInicial: new Date(data.dtInicial),
        dtFinal: new Date(data.dtFinal),
        saldo: parseFloat(data.saldo),
      };
      await api.post("/projetos", payload);
      reset();
      loadProjects();
    } catch (e) {
      alert("Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Excluir projeto?")) {
      await api.delete(`/projetos/${id}`);
      loadProjects();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg">
          <Briefcase size={28} />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Projetos & TEDs</h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Nome do Projeto
            </label>
            <input
              {...register("nomeDoProjeto")}
              required
              className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200"
              placeholder="Ex: Projeto de Pesquisa XYZ"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Nº TED / Convênio
            </label>
            <input
              {...register("numTed")}
              required
              className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200"
              placeholder="Ex: 10/2024"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Conta Corrente
            </label>
            <input
              {...register("contaCorrente")}
              required
              className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200"
              placeholder="Ex: 12345-X"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Saldo Orçamentário (R$)
            </label>
            <input
              type="number"
              step="0.01"
              {...register("saldo")}
              required
              className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200"
              placeholder="0.00"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Início
              </label>
              <input
                type="date"
                {...register("dtInicial")}
                required
                className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Fim
              </label>
              <input
                type="date"
                {...register("dtFinal")}
                required
                className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200"
              />
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            disabled={loading}
            className="bg-slate-900 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-600 transition-all flex items-center gap-2">
            <Plus size={18} /> Cadastrar Projeto
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((p) => (
          <div
            key={p.id}
            className="bg-white p-6 rounded-3xl border border-slate-200 hover:shadow-lg transition-all relative group">
            <button
              type="button"
              onClick={() => handleDelete(p.id)}
              className="absolute top-4 right-4 z-10 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto"
              aria-label="Excluir projeto">
              <Trash2 size={18} />
            </button>
            <h3 className="font-bold text-slate-800 text-lg mb-1">
              {p.nomeDoProjeto}
            </h3>
            <p className="text-xs font-black text-blue-600 uppercase mb-4 tracking-widest">
              TED: {p.numTed}
            </p>

            <div className="flex items-center justify-between text-sm text-slate-500 bg-slate-50 p-3 rounded-xl">
              <div className="flex items-center gap-2">
                <Calendar size={14} />{" "}
                {new Date(p.dtInicial).toLocaleDateString()} -{" "}
                {new Date(p.dtFinal).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-2 font-black text-slate-700">
                <Wallet size={14} /> {formatMoneyBRL(p.saldo)}
              </div>
            </div>
            <Link
              to={`/app/cadastros/projetos/${p.id}`}
              className="relative z-20 mt-4 inline-flex items-center gap-2 text-sm font-black text-blue-600 hover:text-blue-800">
              <ExternalLink size={16} /> Controle financeiro / edição
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
