import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Lock,
  Plus,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuthStore } from "../store/authStore";

// Relatório em aberto (ou em correção) com prazo vencido bloqueia novas viagens (Regra 5)
const isReportPending = (report: any) =>
  report && ["ABERTO", "EM_CORRECAO"].includes(report.status);
const isReportOverdue = (report: any) =>
  isReportPending(report) && new Date(report.prazoLimite) < new Date();

// Detalhes (viagens) em que o usuário logado é o agente
const myTrips = (solicitacoes: any[], userId?: number) =>
  solicitacoes.flatMap((s: any) => s.details ?? []).filter((d: any) => d.agentId === userId);

// Componente visual de Card
const StatsCard = ({ icon, label, value, color, highlight }: any) => {
  const colors: any = {
    blue: "bg-blue-100 text-blue-600",
    red: "bg-red-100 text-red-600",
    green: "bg-green-100 text-green-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <div
      className={`bg-white p-6 rounded-3xl shadow-sm border ${
        highlight ? "border-red-500 ring-4 ring-red-50" : "border-slate-200"
      } flex items-center gap-5 transition-transform hover:scale-105`}>
      <div className={`p-4 rounded-2xl ${colors[color] || colors.slate}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">
          {label}
        </p>
        <p className="text-2xl font-black text-slate-900 leading-none">
          {value}
        </p>
      </div>
    </div>
  );
};

const DynamicStatsCards = ({ solicitacoes, projetos }: { solicitacoes: any[]; projetos: any[] }) => {
  const { user } = useAuthStore();

  const stats = useMemo(() => {
    return {
      saldoTotal: projetos.reduce((acc: number, p: any) => acc + Number(p.saldo), 0),
      pendentesAprovacao: solicitacoes.filter((s: any) =>
        (user?.roles.includes("DIRECAO") && s.status === "AGUARDANDO_DIRECAO") ||
        (user?.roles.includes("FINANCEIRO") && s.status === "AGUARDANDO_FINANCEIRO")
      ).length,
      minhasViagens: solicitacoes.filter((s: any) => s.requesterId === user?.id).length,
      relatoriosPendentes: myTrips(solicitacoes, user?.id).filter((d: any) =>
        isReportPending(d.report),
      ).length
    };
  }, [solicitacoes, projetos, user]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* CARD: SALDO (Apenas Admin/Financeiro) */}
      {(user?.roles.includes("ADMIN") || user?.roles.includes("FINANCEIRO")) && (
        <StatsCard icon={<Wallet size={20} />} label="Saldo Geral TEDs" value={`R$ ${stats.saldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} color="green" />
      )}

      {/* CARD: PENDÊNCIAS DE APROVAÇÃO (Direção/Financeiro) */}
      {["ADMIN", "FINANCEIRO", "DIRECAO"].some(r => user?.roles.includes(r)) && (
        <StatsCard icon={<Clock size={20} />} label="Para Aprovar" value={stats.pendentesAprovacao} color="red" />
      )}

      {/* CARD: RELATÓRIOS (Agente) */}
      {user?.isSolicitant && (
        <StatsCard icon={<AlertTriangle size={20} />} label="Relatórios Pendentes" value={stats.relatoriosPendentes} color="red" highlight={stats.relatoriosPendentes > 0} />
      )}

      {/* CARD: SUCESSO (Todos) */}
      <StatsCard icon={<CheckCircle size={20} />} label="Minhas Viagens" value={stats.minhasViagens} color="blue" />
    </div>
  );
}

export default function Dashboard() {
  const { user, activeRole } = useAuthStore();
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);

  useEffect(() => {
    api.get("/solicitacoes").then((r) => setSolicitacoes(r.data)).catch(() => {});
    api.get("/projetos").then((r) => setProjetos(r.data)).catch(() => {});
  }, []);

  const isBlocked = useMemo(
    () => myTrips(solicitacoes, user?.id).some((d: any) => isReportOverdue(d.report)),
    [solicitacoes, user],
  );

  const recentSolicitations = useMemo(() => solicitacoes.slice(0, 5), [solicitacoes]);

  // 👇 NOVA TRAVA DE SEGURANÇA À PROVA DE FALHAS
  // Se ele NÃO for solicitante E NÃO for do grupo de gestão, ele é um Agente simples!
  const isSimpleAgent =
    !user?.isSolicitant &&
    !user?.roles?.some((r: string) =>
      ["ADMIN", "FINANCEIRO", "DIRECAO", "COORDENACAO"].includes(r),
    );

  // Tela SUPER LIMPA para o Agente
  if (isSimpleAgent) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center animate-in fade-in duration-500">
        <h2 className="text-4xl font-black text-slate-300 mb-3">
          Bem-vindo, {user?.name || "Agente"}!
        </h2>
        <p className="text-slate-500 font-medium max-w-sm">
          Você está no seu painel de Agente. Utilize o menu lateral para
          verificar seus relatórios de viagem ou atualizar seu perfil
          operacional.
        </p>
      </div>
    );
  }

  // O resto do código só aparece para a Gestão / Solicitantes
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-black text-slate-900">
          Painel de Controle
        </h2>
        <p className="text-slate-500 text-sm">
          Bem-vindo, {user?.name}{" "}
          <span className="font-bold">({activeRole || user?.roles?.[0]})</span>
        </p>
      </header>

      {/* Cards de Estatísticas */}
      <DynamicStatsCards solicitacoes={solicitacoes} projetos={projetos} />

      {/* Alerta de Bloqueio */}
      {isBlocked && (
        <div className="bg-red-600 text-white p-6 rounded-3xl flex gap-6 items-center shadow-lg shadow-red-200">
          <AlertCircle className="w-10 h-10 shrink-0" />
          <div className="flex-1">
            <h4 className="font-black text-lg">Bloqueio por Inadimplência</h4>
            <p className="text-sm opacity-90" >
              Você possui relatórios de viagem pendentes. Novas solicitações estão suspensas até a regularização.
            </p>
          </div>
        </div>
      )}

      {/* Ações Rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-black text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Últimas Solicitações
            </h3>
          </div>
          <div className="p-6">
            {recentSolicitations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
                <FileText size={32} className="opacity-20" />
                <p className="text-sm">Nenhuma solicitação recente.</p>
              </div>
            ) : (
              recentSolicitations.map((s: any) => (
                <div
                  key={s.id}
                  className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-slate-800">#{s.id}</p>
                    <p className="text-xs text-slate-400">{s.destino}</p>
                  </div>
                  <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    {s.status?.replace(/_/g, " ")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card de Solicitar Nova Viagem - Só aparece se for solicitante */}
        {user?.isSolicitant && (
          <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col justify-between shadow-2xl shadow-slate-400/20">
            <div>
              <div className="bg-blue-600 w-fit p-3 rounded-2xl mb-6 shadow-lg shadow-blue-900/50">
                <Plus />
              </div>
              <h3 className="text-2xl font-black">Nova Viagem?</h3>
              <p className="text-slate-400 text-sm mt-2">
                Clique abaixo para iniciar o fluxo de solicitação de diárias.
              </p>
            </div>

            <Link
              to="/app/solicitacoes/nova"
              className={`mt-8 w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${
                isBlocked
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-white text-slate-900 hover:bg-blue-600 hover:text-white"
              }`}
              onClick={(e) => isBlocked && e.preventDefault()}>
              {isBlocked ? <Lock size={16} /> : <Plus size={16} />}
              {isBlocked ? "Bloqueado" : "Solicitar Diária"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
