import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import {
  Plane,
  Plus,
  Trash2,
  Search,
  Loader2,
  FileText,
  Calendar,
  MapPin,
  Briefcase,
  GraduationCap,
} from "lucide-react";

export default function Solicitations() {
  const { user } = useAuthStore();
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const response = await api.get("/solicitacoes");
      setSolicitacoes(response.data);
    } catch (error) {
      console.error("Erro ao carregar solicitações", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: number) => {
    if (confirm("Deseja realmente excluir esta solicitação?")) {
      try {
        await api.delete(`/solicitacoes/${id}`);
        loadData();
      } catch (error: any) {
        alert(error.response?.data?.error || "Erro ao excluir.");
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      RASCUNHO: "bg-slate-100 text-slate-600",
      AGUARDANDO_DIRECAO:
        "bg-yellow-100 text-yellow-700 border border-yellow-200",
      AGUARDANDO_FINANCEIRO:
        "bg-orange-100 text-orange-700 border border-orange-200",
      PENDENTE_CORRECAO: "bg-red-100 text-red-700 border border-red-200",
      APROVADO_PARA_PAGAMENTO:
        "bg-emerald-100 text-emerald-700 border border-emerald-200",
      PAGO: "bg-blue-100 text-blue-700 border border-blue-200",
    };
    return badges[status] || "bg-slate-100 text-slate-600";
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg">
            <Plane size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Solicitações de Viagem
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Gestão de diárias e missões institucionais.
            </p>
          </div>
        </div>
        {user?.isSolicitant && (
          <Link
            to="/app/solicitacoes/nova"
            className="bg-slate-900 text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-600 transition-all flex items-center gap-2 shadow-xl">
            <Plus size={18} /> Nova Viagem
          </Link>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p className="text-sm font-bold uppercase tracking-widest">
              Carregando...
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase font-black text-[10px] tracking-widest border-b border-slate-100">
                <tr>
                  <th className="p-5">ID</th>
                  <th className="p-5">Data / Período</th>
                  <th className="p-5">Projeto</th>
                  <th className="p-5">Rota (Origem/Destino)</th>
                  <th className="p-5">Curso</th>
                  <th className="p-5">Status</th>
                  <th className="p-5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {solicitacoes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-20 text-center text-slate-300 font-medium">
                      Nenhuma solicitação encontrada.
                    </td>
                  </tr>
                ) : (
                  solicitacoes.map((sol) => (
                    <tr
                      key={sol.id}
                      className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-5 font-black text-slate-300">
                        #{sol.id}
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-2 text-slate-700 font-bold">
                          <Calendar size={14} className="text-blue-500" />
                          {new Date(sol.dataIda).toLocaleDateString("pt-BR")}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium ml-6">
                          até{" "}
                          {new Date(sol.dataVolta).toLocaleDateString("pt-BR")}
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-2 text-slate-600 font-semibold">
                          <Briefcase size={14} className="text-slate-400" />
                          {sol.details?.[0]?.project?.nomeDoProjeto || "N/A"}
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                            <MapPin size={12} /> {sol.origem}
                          </span>
                          <span className="flex items-center gap-1.5 text-slate-900 font-bold ml-3">
                            <Plane
                              size={12}
                              className="rotate-90 text-blue-500"
                            />{" "}
                            {sol.destino}
                          </span>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-2 text-[10px] font-black text-purple-600 uppercase bg-purple-50 px-2 py-1 rounded-lg w-fit">
                          <GraduationCap size={12} />
                          {sol.requester?.course?.nome || "Sem Curso"}
                        </div>
                      </td>
                      <td className="p-5">
                        <span
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${getStatusBadge(sol.status)}`}>
                          {sol.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        {user?.isSolicitant &&
                          [
                            "RASCUNHO",
                            "AGUARDANDO_DIRECAO",
                            "PENDENTE_CORRECAO",
                          ].includes(sol.status) && (
                            <button
                              onClick={() => handleDelete(sol.id)}
                              className="text-red-300 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-xl">
                              <Trash2 size={18} />
                            </button>
                          )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
