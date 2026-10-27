import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import api from "../services/api";
import { useAuthStore } from "../store/authStore";

type ReportStatus = "ABERTO" | "FECHADO" | "EM_CORRECAO" | "APROVADO" | "ARQUIVADO";

interface Report {
  id: number;
  status: ReportStatus;
  prazoLimite: string;
  atividadesRealizadas?: string | null;
  comprovanteUrl?: string | null;
  history: { id: number; acao: string; data: string; motivoRecusa?: string | null; observacao?: string | null }[];
  detail: {
    agentId: number;
    agent: { firstName?: string; lastName?: string; nomeSocial?: string };
    solicitation: { id: number; destino: string; dataVolta: string; requesterId: number };
  };
}

const STATUS_STYLE: Record<ReportStatus, string> = {
  ABERTO: "bg-amber-50 text-amber-700 border-amber-200",
  EM_CORRECAO: "bg-orange-50 text-orange-700 border-orange-200",
  FECHADO: "bg-blue-50 text-blue-700 border-blue-200",
  APROVADO: "bg-green-50 text-green-700 border-green-200",
  ARQUIVADO: "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_LABEL: Record<ReportStatus, string> = {
  ABERTO: "AGUARDANDO ENVIO",
  EM_CORRECAO: "EM CORREÇÃO",
  FECHADO: "EM ANÁLISE",
  APROVADO: "APROVADO",
  ARQUIVADO: "ARQUIVADO",
};

const MOTIVOS_RECUSA: Record<string, string> = {
  DOCUMENTACAO_INCOMPLETA: "Documentação incompleta",
  DADOS_INCORRETOS: "Dados incorretos",
  FALTA_DE_COMPROVANTES: "Falta de comprovantes",
  OUTROS: "Outros",
};

const MAX_UPLOAD_MB = 10;
const formatDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

export default function MyReports() {
  const { user } = useAuthStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal de envio (agente) e de análise (FADEX)
  const [uploadFor, setUploadFor] = useState<Report | null>(null);
  const [reviewFor, setReviewFor] = useState<Report | null>(null);

  const isReviewer = ["ADMIN", "FINANCEIRO", "FADEX"].some((r) => user?.roles.includes(r));

  const load = () =>
    api
      .get("/relatorios")
      .then((res) => setReports(res.data))
      .catch(() => setError("Não foi possível carregar os relatórios."))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const isPending = (r: Report) => r.status === "ABERTO" || r.status === "EM_CORRECAO";
  const isOverdue = (r: Report) => isPending(r) && new Date(r.prazoLimite) < new Date();
  const canSend = (r: Report) =>
    isPending(r) &&
    (r.detail.agentId === user?.id ||
      r.detail.solicitation.requesterId === user?.id ||
      user?.roles.includes("ADMIN"));

  // O download precisa do token, por isso é feito via API e não por link direto
  const download = async (r: Report) => {
    try {
      const res = await api.get(`/relatorios/${r.id}/comprovante`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      alert("Não foi possível baixar o comprovante.");
    }
  };

  const lastReturn = (r: Report) => r.history.find((h) => h.acao === "DEVOLVIDO");

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black text-slate-900">Prestação de Contas</h2>
        <p className="text-slate-500 text-sm font-medium uppercase tracking-widest flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500" /> Prazo: 5 dias após o retorno.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="animate-spin" size={18} /> Carregando...
        </div>
      )}
      {error && <p className="text-red-600 font-bold">{error}</p>}
      {!loading && !error && reports.length === 0 && (
        <p className="text-slate-500">Nenhum relatório de viagem encontrado.</p>
      )}

      <div className="grid grid-cols-1 gap-4">
        {reports.map((report) => {
          const overdue = isOverdue(report);
          const agent = report.detail.agent;
          const devolucao = report.status === "EM_CORRECAO" ? lastReturn(report) : undefined;
          return (
            <div
              key={report.id}
              className={`bg-white p-8 rounded-[35px] border ${overdue ? "border-red-200 ring-4 ring-red-50" : "border-slate-100"} flex flex-col gap-4 hover:shadow-xl transition-all`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className={`p-5 rounded-3xl ${overdue ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
                    <FileText size={32} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-black text-slate-900 text-lg leading-none">
                        Solicitação #{report.detail.solicitation.id}
                      </p>
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${STATUS_STYLE[report.status]}`}>
                        {overdue ? "ATRASADO" : STATUS_LABEL[report.status]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-bold uppercase">
                      {agent.nomeSocial || `${agent.firstName ?? ""} ${agent.lastName ?? ""}`} •{" "}
                      {report.detail.solicitation.destino} • Retorno:{" "}
                      {formatDate(report.detail.solicitation.dataVolta)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:items-end gap-3">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase">
                    <Calendar size={14} /> Prazo Final:{" "}
                    <span className={overdue ? "text-red-600" : "text-slate-800"}>
                      {formatDate(report.prazoLimite)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {report.comprovanteUrl && (
                      <button
                        onClick={() => download(report)}
                        className="text-xs font-black px-4 py-3 rounded-2xl flex items-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200">
                        <Download size={16} /> Comprovante
                      </button>
                    )}
                    {canSend(report) && (
                      <button
                        onClick={() => setUploadFor(report)}
                        className="bg-slate-900 text-white text-xs font-black px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-blue-600 transition-all">
                        <Upload size={16} />
                        {report.status === "EM_CORRECAO" ? "Reenviar Comprovante" : "Enviar Comprovante"}
                      </button>
                    )}
                    {isReviewer && report.status === "FECHADO" && (
                      <button
                        onClick={() => setReviewFor(report)}
                        className="bg-blue-600 text-white text-xs font-black px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-blue-700 transition-all">
                        <CheckCircle2 size={16} /> Analisar
                      </button>
                    )}
                    {report.status === "APROVADO" && (
                      <div className="text-[10px] text-green-600 font-black flex items-center gap-2 bg-green-50 px-5 py-2.5 rounded-full border border-green-100">
                        <CheckCircle2 size={16} /> Aprovado pela FADEX
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {devolucao && (
                <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-2xl text-sm">
                  <p className="font-black uppercase text-[10px] tracking-widest mb-1">
                    Devolvido em {formatDate(devolucao.data)}:{" "}
                    {MOTIVOS_RECUSA[devolucao.motivoRecusa ?? ""] ?? devolucao.motivoRecusa}
                  </p>
                  {devolucao.observacao}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {uploadFor && (
        <UploadModal
          report={uploadFor}
          onClose={() => setUploadFor(null)}
          onDone={() => {
            setUploadFor(null);
            load();
          }}
        />
      )}
      {reviewFor && (
        <ReviewModal
          report={reviewFor}
          onDownload={() => download(reviewFor)}
          onClose={() => setReviewFor(null)}
          onDone={() => {
            setReviewFor(null);
            load();
          }}
        />
      )}
    </div>
  );
}

const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) => (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-slate-900">{title}</h3>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
          <X />
        </button>
      </div>
      {children}
    </div>
  </div>
);

function UploadModal({ report, onClose, onDone }: { report: Report; onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [atividades, setAtividades] = useState(report.atividadesRealizadas ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!file) return setError("Selecione o arquivo do comprovante.");
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      return setError(`O arquivo deve ter no máximo ${MAX_UPLOAD_MB} MB.`);
    }
    if (atividades.trim().length < 10) {
      return setError("Descreva as atividades realizadas (mín. 10 caracteres).");
    }

    const form = new FormData();
    form.append("file", file);
    form.append("atividadesRealizadas", atividades.trim());

    setSending(true);
    try {
      // Content-Type é definido pelo navegador (multipart com boundary)
      await api.post(`/relatorios/${report.id}/comprovante`, form, {
        headers: { "Content-Type": undefined },
      });
      onDone();
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao enviar o comprovante.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal title={`Prestação de contas — Solicitação #${report.detail.solicitation.id}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-bold">{error}</div>}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Atividades realizadas</label>
          <textarea
            value={atividades}
            onChange={(e) => setAtividades(e.target.value)}
            rows={4}
            className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Descreva as atividades desenvolvidas durante a viagem..."
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
            Comprovante (PDF, JPG ou PNG — até {MAX_UPLOAD_MB} MB)
          </label>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={sending}
          className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-blue-600 transition-all flex justify-center items-center gap-2 disabled:opacity-50">
          {sending ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
          {sending ? "Enviando..." : "Enviar para análise"}
        </button>
      </form>
    </Modal>
  );
}

function ReviewModal({
  report,
  onDownload,
  onClose,
  onDone,
}: {
  report: Report;
  onDownload: () => void;
  onClose: () => void;
  onDone: () => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [observacao, setObservacao] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const review = async (action: "APPROVE" | "REJECT") => {
    setError("");
    if (action === "REJECT" && !motivoRecusa) return setError("Selecione o motivo da devolução.");
    setSending(true);
    try {
      await api.patch(`/relatorios/${report.id}/status`, {
        action,
        ...(action === "REJECT" && { motivoRecusa }),
        observacao: observacao.trim() || undefined,
      });
      onDone();
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao registrar a análise.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal title={`Analisar relatório — Solicitação #${report.detail.solicitation.id}`} onClose={onClose}>
      {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-bold">{error}</div>}
      <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
        <p className="text-[10px] font-black text-slate-400 uppercase">Atividades realizadas</p>
        <p className="text-sm text-slate-700 whitespace-pre-wrap">{report.atividadesRealizadas}</p>
      </div>
      <button
        onClick={onDownload}
        className="text-sm font-bold px-4 py-3 rounded-xl flex items-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200">
        <Download size={16} /> Abrir comprovante
      </button>

      {rejecting && (
        <div className="space-y-3">
          <select
            value={motivoRecusa}
            onChange={(e) => setMotivoRecusa(e.target.value)}
            className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-bold">
            <option value="">Motivo da devolução...</option>
            {Object.entries(MOTIVOS_RECUSA).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={3}
            placeholder="Observações para o agente (opcional)"
            className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm"
          />
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-end gap-3">
        <button
          disabled={sending}
          onClick={() => (rejecting ? review("REJECT") : setRejecting(true))}
          className="px-6 py-3 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 flex items-center justify-center gap-2 disabled:opacity-50">
          <Undo2 size={18} /> {rejecting ? "Confirmar devolução" : "Devolver para correção"}
        </button>
        {!rejecting && (
          <button
            disabled={sending}
            onClick={() => review("APPROVE")}
            className="px-6 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-50">
            <CheckCircle2 size={18} /> Aprovar
          </button>
        )}
      </div>
    </Modal>
  );
}
