import {
  Briefcase,
  Calendar,
  Car,
  CheckCircle2,
  Eye,
  FileCheck,
  GraduationCap,
  Info,
  Landmark,
  Loader2,
  MapPin,
  Pencil,
  Plane,
  Plus,
  Trash2,
  Undo2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { useAuthStore } from "../../store/authStore";

export default function Solicitations() {
  const { user, activeRole } = useAuthStore();
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSol, setSelectedSol] = useState<any | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

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

  // Ações disponíveis para o usuário conforme seus perfis e o status atual (Regra 3)
  const getAvailableActions = (sol: any) => {
    const roles = user?.roles ?? [];
    if (roles.includes("DIRECAO") && sol.status === "AGUARDANDO_DIRECAO") return ["APPROVE", "REJECT"];
    if (roles.includes("FINANCEIRO") && sol.status === "AGUARDANDO_FINANCEIRO") return ["APPROVE", "REJECT"];
    if (roles.includes("FADEX") && sol.status === "APROVADO_PARA_PAGAMENTO") return ["PAY"];
    return [];
  };

  const canDelete = (sol: any) =>
    !["APROVADO_PARA_PAGAMENTO", "PAGO"].includes(sol.status) &&
    (user?.roles.includes("ADMIN") || sol.requesterId === user?.id);

  // Quem criou pode corrigir e reenviar uma solicitação devolvida
  const canResubmit = (sol: any) =>
    sol.status === "PENDENTE_CORRECAO" &&
    (sol.requesterId === user?.id || user?.roles.includes("ADMIN"));

  const closeModal = () => {
    setSelectedSol(null);
    setIsRejecting(false);
    setRejectReason("");
  };

  const handleStatusUpdate = async (id: number, action: "APPROVE" | "REJECT" | "PAY") => {
    if (action === "REJECT" && !rejectReason.trim()) {
      setIsRejecting(true);
      return;
    }

    setProcessing(true);
    try {
      // O backend valida o perfil pelo token; o perfil ativo só indica a preferência
      await api.patch(`/solicitacoes/${id}/status`, {
        action,
        reason: action === "REJECT" ? rejectReason.trim() : undefined,
        role: activeRole || undefined,
      });

      const messages = {
        APPROVE: "Solicitação aprovada!",
        REJECT: "Solicitação devolvida para correção.",
        PAY: "Pagamento registrado!",
      };
      alert(messages[action]);
      closeModal();
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.error || "Erro ao processar ação.");
    } finally {
      setProcessing(false);
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
      {/* HEADER */}
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

      {/* TABELA */}
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
                  <th className="p-5">Período</th>
                  <th className="p-5">Projeto / TED</th>
                  <th className="p-5">Rota</th>
                  <th className="p-5">Status</th>
                  <th className="p-5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {solicitacoes.map((sol) => (
                  <tr
                    key={sol.id}
                    className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-5 font-black text-slate-300">#{sol.id}</td>
                    <td className="p-5 font-bold">
                      {new Date(sol.dataIda).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="p-5">
                      <p className="font-bold text-slate-700">
                        {sol.details?.[0]?.project?.nomeDoProjeto || "N/A"}
                      </p>
                      <p className="text-[10px] text-blue-600 font-black uppercase">
                        TED: {sol.details?.[0]?.project?.numTed}
                      </p>
                    </td>
                    <td className="p-5 font-bold">
                      {sol.origem} → {sol.destino}
                    </td>
                    <td className="p-5">
                      <span
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${getStatusBadge(sol.status)}`}>
                        {sol.status?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="flex justify-center gap-2">
                      <button
                        onClick={() => setSelectedSol(sol)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                        <Eye size={18} />
                      </button>
                      {canDelete(sol) && (
                        <button
                          onClick={() => handleDelete(sol.id)}
                          className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all">
                          <Trash2 size={18} />
                        </button>
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

      {/* MODAL DE DETALHES COMPLETO */}
      {selectedSol && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
                  <Info size={24} />
                </div>
                <h2 className="text-xl font-black text-slate-900">
                  Solicitação #{selectedSol.id}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                <X />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {selectedSol.status === "PENDENTE_CORRECAO" && selectedSol.observacaoDevolucao && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm">
                  <p className="font-black uppercase text-[10px] tracking-widest mb-1">
                    Motivo da devolução
                  </p>
                  {selectedSol.observacaoDevolucao}
                </div>
              )}

              {canResubmit(selectedSol) && (
                <Link
                  to={`/app/solicitacoes/${selectedSol.id}/editar`}
                  className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
                  <Pencil size={18} /> Corrigir e reenviar
                </Link>
              )}

              {/* 1. LOGÍSTICA E ROTA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Logística e Rota
                  </h4>
                  <div className="bg-slate-50 p-5 rounded-2xl space-y-3">
                    <p className="text-sm font-bold flex items-center gap-2">
                      <MapPin size={16} className="text-blue-500" />{" "}
                      {selectedSol.origem} → {selectedSol.destino}
                    </p>
                    <p className="text-sm font-bold flex items-center gap-2">
                      <Calendar size={16} className="text-blue-500" />
                      {new Date(selectedSol.dataIda).toLocaleDateString("pt-BR")} -{" "}
                      {new Date(selectedSol.dataVolta).toLocaleDateString("pt-BR")}
                    </p>
                    <p className="text-sm font-bold flex items-center gap-2">
                      <Car size={16} className="text-blue-500" />
                      {selectedSol.details?.[0]?.meioTransporte}{" "}
                      {selectedSol.details?.[0]?.tipoVeiculo
                        ? `(${selectedSol.details[0].tipoVeiculo})`
                        : ""}
                    </p>
                    {selectedSol.details?.[0]?.condutor && (
                      <p className="text-xs font-mono bg-blue-100 text-blue-700 px-3 py-2 rounded-xl">
                        Condutor: {selectedSol.details[0].condutor} | Placa:{" "}
                        {selectedSol.details[0].placaVeiculo}
                      </p>
                    )}
                  </div>
                </div>

                {/* 2. FINANCEIRO E PROJETO */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Financeiro e Orçamento
                  </h4>
                  <div className="bg-slate-50 p-5 rounded-2xl space-y-3">
                    <p className="text-sm font-bold flex items-center gap-2">
                      <Briefcase size={16} className="text-emerald-500" />{" "}
                      {selectedSol.details?.[0]?.project?.nomeDoProjeto}
                    </p>
                    <p className="text-xs font-black text-emerald-600 uppercase ml-6">
                      TED: {selectedSol.details?.[0]?.project?.numTed}
                    </p>
                    <p className="text-sm font-bold flex items-center gap-2">
                      <GraduationCap size={16} className="text-purple-500" />{" "}
                      {selectedSol.requester?.course?.nome ||
                        "Departamento Geral"}
                    </p>
                    <p className="text-sm font-bold flex items-center gap-2">
                      <Wallet size={16} className="text-orange-500" /> Valor
                      Total Estimado: R${" "}
                      {selectedSol.details
                        ?.reduce(
                          (acc: number, d: any) =>
                            acc +
                            Number(d.qtdDiarias) *
                              Number(d.dailyRateType?.valor || 0),
                          0,
                        )
                        .toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. JUSTIFICATIVA */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Objetivo e Justificativa
                </h4>
                <div className="bg-slate-50 p-5 rounded-2xl">
                  <p className="text-xs font-black text-blue-600 uppercase mb-2">
                    Objetivo: {selectedSol.details?.[0]?.objective?.objetivo}
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed italic">
                    "{selectedSol.motivoSolicitacao}"
                  </p>
                </div>
              </div>

              {/* 4. AGENTES (VIAJANTES) E DADOS BANCÁRIOS */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Users size={14} /> Agentes e Pagamentos
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  {selectedSol.details?.map((det: any) => (
                    <div
                      key={det.id}
                      className="border border-slate-100 p-5 rounded-3xl flex flex-col md:flex-row justify-between gap-4 shadow-sm hover:border-blue-200 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="bg-slate-100 h-12 w-12 rounded-full flex items-center justify-center text-slate-400 font-bold text-xl uppercase">
                          {det.agent?.nomeSocial?.[0] ||
                            det.agent?.firstName?.[0]}
                        </div>
                        <div>
                          <p className="text-base font-black text-slate-800">
                            {det.agent?.nomeSocial ||
                              `${det.agent?.firstName} ${det.agent?.lastName}`}
                          </p>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                            CPF: {det.agent?.cpf} | {det.dailyRateType?.nome} (
                            {det.qtdDiarias} diárias)
                          </p>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl flex items-center gap-4">
                        <div className="text-slate-400">
                          <Landmark size={20} />
                        </div>
                        <div className="text-[10px] font-bold">
                          <p className="text-slate-400 uppercase">
                            Dados Bancários
                          </p>
                          <p className="text-slate-700">
                            Banco: {det.agent?.banco?.nome || "N/A"}
                          </p>
                          <p className="text-slate-700">
                            Ag: {det.agent?.agencia} | CC: {det.agent?.conta}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. RELATÓRIO DE VIAGEM */}
              {selectedSol.details?.[0]?.report && (
                <div className="pt-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <FileCheck size={14} /> Status da Prestação de Contas
                  </h4>
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex justify-between items-center">
                    <span className="text-sm font-bold text-blue-800 uppercase">
                      Relatório de Viagem
                    </span>
                    <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase">
                      {selectedSol.details[0].report.status}
                    </span>
                  </div>
                </div>
              )}

              {/* 6. AÇÕES DO FLUXO DE APROVAÇÃO */}
              {getAvailableActions(selectedSol).length > 0 && (
                <div className="pt-6 border-t border-slate-100 space-y-4">
                  {isRejecting && (
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Descreva o motivo da devolução..."
                      rows={3}
                      autoFocus
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-red-400"
                    />
                  )}
                  <div className="flex flex-col md:flex-row justify-end gap-3">
                    {getAvailableActions(selectedSol).includes("REJECT") && (
                      <button
                        disabled={processing}
                        onClick={() => handleStatusUpdate(selectedSol.id, "REJECT")}
                        className="px-6 py-3 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 flex items-center justify-center gap-2 disabled:opacity-50">
                        <Undo2 size={18} /> {isRejecting ? "Confirmar devolução" : "Devolver para correção"}
                      </button>
                    )}
                    {getAvailableActions(selectedSol).includes("APPROVE") && !isRejecting && (
                      <button
                        disabled={processing}
                        onClick={() => handleStatusUpdate(selectedSol.id, "APPROVE")}
                        className="px-6 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-50">
                        <CheckCircle2 size={18} /> Aprovar
                      </button>
                    )}
                    {getAvailableActions(selectedSol).includes("PAY") && (
                      <button
                        disabled={processing}
                        onClick={() => handleStatusUpdate(selectedSol.id, "PAY")}
                        className="px-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50">
                        <Wallet size={18} /> Registrar pagamento
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
