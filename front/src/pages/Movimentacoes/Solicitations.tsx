import {
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  PlaneTakeoff,
  Plus,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { useAuthStore } from "../../store/authStore";

export default function Solicitations() {
  const [solicitations, setSolicitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeRole } = useAuthStore(); // Pega o cargo ativo do usuário

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.get("/solicitacoes");
      setSolicitations(response.data);
    } catch (err) {
      console.error("Erro ao carregar solicitações", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Função que envia a aprovação/rejeição para o Backend
  const handleAction = async (
    id: number,
    action: "APPROVE" | "REJECT" | "PAY",
  ) => {
    const confirmMessage =
      action === "APPROVE"
        ? "Confirmar aprovação?"
        : action === "PAY"
          ? "Confirmar pagamento?"
          : "Devolver para correção?";

    if (!window.confirm(confirmMessage)) return;

    try {
      await api.patch(`/solicitacoes/${id}/status`, {
        role: activeRole,
        action: action,
      });
      loadData(); // Recarrega a lista para atualizar os status na tela
    } catch (error: any) {
      alert(error.response?.data?.error || "Erro ao processar ação.");
    }
  };

  // Função auxiliar para renderizar a cor e o ícone do Status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AGUARDANDO_DIRECAO":
        return (
          <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">
            <Clock size={14} /> Dir. Analisando
          </span>
        );
      case "AGUARDANDO_FINANCEIRO":
        return (
          <span className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
            <Clock size={14} /> Finan. Analisando
          </span>
        );
      case "APROVADO_PARA_PAGAMENTO":
        return (
          <span className="flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">
            <CheckCircle2 size={14} /> Aguardando Pgto
          </span>
        );
      case "PAGO":
        return (
          <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
            <DollarSign size={14} /> Pago
          </span>
        );
      case "PENDENTE_CORRECAO":
        return (
          <span className="flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
            <AlertCircle size={14} /> Pendente Correção
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* CABEÇALHO ATUALIZADO COM O BOTÃO ALINHADO À DIREITA */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg">
            <PlaneTakeoff size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Gestão de Solicitações
            </h1>
            <p className="text-sm text-slate-500">
              Acompanhamento e aprovação de viagens
            </p>
          </div>
        </div>

        {/* SÓ MOSTRA O BOTÃO SE FOR SOLICITANTE */}
        {activeRole === "SOLICITANTE" && (
          <Link
            to="/app/solicitacoes/nova"
            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-600 transition-colors shadow-md">
            <Plus size={18} /> Nova Viagem
          </Link>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            Carregando solicitações...
          </div>
        ) : solicitations.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            Nenhuma solicitação encontrada para o seu perfil.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-widest text-slate-400 font-black">
                  <th className="p-4">ID</th>
                  <th className="p-4">Trecho (Ida / Volta)</th>
                  <th className="p-4">Motivo</th>
                  <th className="p-4">Status Atual</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {solicitations.map((sol) => (
                  <tr
                    key={sol.id}
                    className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">#{sol.id}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-700">
                        {sol.origem} ➔ {sol.destino}
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(sol.dataIda).toLocaleDateString("pt-BR")} até{" "}
                        {new Date(sol.dataVolta).toLocaleDateString("pt-BR")}
                      </div>
                    </td>
                    <td
                      className="p-4 text-slate-600 max-w-xs truncate"
                      title={sol.motivoSolicitacao}>
                      {sol.motivoSolicitacao}
                    </td>
                    <td className="p-4">{getStatusBadge(sol.status)}</td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        {/* BOTÕES PARA A DIREÇÃO */}
                        {activeRole === "DIRECAO" &&
                          sol.status === "AGUARDANDO_DIRECAO" && (
                            <>
                              <button
                                onClick={() => handleAction(sol.id, "APPROVE")}
                                className="p-2 bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors"
                                title="Aprovar">
                                <CheckCircle2 size={18} />
                              </button>
                              <button
                                onClick={() => handleAction(sol.id, "REJECT")}
                                className="p-2 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-colors"
                                title="Devolver">
                                <XCircle size={18} />
                              </button>
                            </>
                          )}

                        {/* BOTÕES PARA O FINANCEIRO */}
                        {activeRole === "FINANCEIRO" &&
                          sol.status === "AGUARDANDO_FINANCEIRO" && (
                            <>
                              <button
                                onClick={() => handleAction(sol.id, "APPROVE")}
                                className="p-2 bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors"
                                title="Aprovar e Enviar para Pagamento">
                                <CheckCircle2 size={18} />
                              </button>
                              <button
                                onClick={() => handleAction(sol.id, "REJECT")}
                                className="p-2 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-colors"
                                title="Devolver para Correção">
                                <XCircle size={18} />
                              </button>
                            </>
                          )}

                        {/* BOTÃO PARA A FADEX (PAGAMENTO) */}
                        {activeRole === "FADEX" &&
                          sol.status === "APROVADO_PARA_PAGAMENTO" && (
                            <button
                              onClick={() => handleAction(sol.id, "PAY")}
                              className="flex items-center gap-1 px-3 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg transition-colors text-xs font-bold shadow-md">
                              <DollarSign size={16} /> Confirmar Pgto
                            </button>
                          )}

                        {/* MENSAGEM SE NÃO TIVER AÇÃO DISPONÍVEL */}
                        {(activeRole === "SOLICITANTE" ||
                          activeRole === "AGENTE" ||
                          (activeRole === "DIRECAO" &&
                            sol.status !== "AGUARDANDO_DIRECAO") ||
                          (activeRole === "FINANCEIRO" &&
                            sol.status !== "AGUARDANDO_FINANCEIRO") ||
                          (activeRole === "FADEX" &&
                            sol.status !== "APROVADO_PARA_PAGAMENTO")) && (
                          <span className="text-xs text-slate-300 font-medium italic">
                            —
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
