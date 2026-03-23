import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import { formatMoneyBRL } from "../../utils/formatMoney";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  History,
  Shuffle,
  Wallet,
  Briefcase,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";

type Line = {
  id: number;
  saldoNatureza: string;
  totalVinculadoAcoes: string;
  saldoDisponivel: string;
  expenseNature: { id: number; nome: string; codigo: string };
};

type Credito = {
  id: number;
  dataCredito: string;
  valor: string;
  notaCredito: string | null;
  somaNaturezas: string;
  lines: Line[];
};

type Acao = {
  id: number;
  descricao: string;
  valor: string;
  expenseNature: { id: number; nome: string; codigo: string };
};

type FinanceiroPayload = {
  project: {
    id: number;
    nomeDoProjeto: string;
    numTed: string;
    dtInicial: string;
    dtFinal: string;
    contaCorrente: string;
    saldo: string;
    courseId: number | null;
  };
  indicadores: {
    saldoCredito: string;
    totalAcoes: string;
    saldoOrcamentario: string;
  };
  creditos: Credito[];
  acoesExecucao: Acao[];
  permissoes: { edicaoFinanceira: boolean; remanejamento: boolean };
};

type NaturezaOpt = { id: number; nome: string; codigo: string; tipo: string };

export default function ProjectFinancialEdit() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const pid = Number(projectId);

  const [data, setData] = useState<FinanceiroPayload | null>(null);
  const [naturezas, setNaturezas] = useState<NaturezaOpt[]>([]);
  const [openCred, setOpenCred] = useState(true);
  const [openAcoes, setOpenAcoes] = useState(true);
  const [projForm, setProjForm] = useState({
    nomeDoProjeto: "",
    numTed: "",
    dtInicial: "",
    dtFinal: "",
    contaCorrente: "",
    saldo: "",
  });

  const [creditModal, setCreditModal] = useState<{
    mode: "create" | "edit";
    credit?: Credito;
  } | null>(null);
  const [actionModal, setActionModal] = useState<{
    mode: "create" | "edit";
    action?: Acao;
  } | null>(null);
  const [histCreditId, setHistCreditId] = useState<number | null>(null);
  const [histRows, setHistRows] = useState<any[]>([]);
  const [remModal, setRemModal] = useState<{
    creditId: number;
    line: Line;
  } | null>(null);

  const load = useCallback(async () => {
    const res = await api.get(`/projetos/${pid}/financeiro`);
    setData(res.data);
    const p = res.data.project;
    setProjForm({
      nomeDoProjeto: p.nomeDoProjeto,
      numTed: p.numTed,
      dtInicial: p.dtInicial.slice(0, 10),
      dtFinal: p.dtFinal.slice(0, 10),
      contaCorrente: p.contaCorrente,
      saldo: String(p.saldo),
    });
  }, [pid]);

  useEffect(() => {
    if (!projectId || Number.isNaN(pid)) {
      navigate("/app/cadastros/projetos", { replace: true });
      return;
    }
    (async () => {
      try {
        await load();
        const n = await api.get("/naturezas-despesa");
        setNaturezas(n.data);
      } catch (e) {
        console.error(e);
        alert("Não foi possível carregar o projeto.");
        navigate("/app/cadastros/projetos");
      }
    })();
  }, [load, navigate, projectId, pid]);

  const saveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.permissoes.edicaoFinanceira) return;
    try {
      await api.patch(`/projetos/${pid}`, {
        ...projForm,
        dtInicial: new Date(projForm.dtInicial).toISOString(),
        dtFinal: new Date(projForm.dtFinal).toISOString(),
        saldo: parseFloat(projForm.saldo),
      });
      await load();
      alert("Projeto atualizado.");
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao salvar projeto.");
    }
  };

  const deleteProject = async () => {
    if (!data?.permissoes.edicaoFinanceira) return;
    if (!confirm("Excluir este projeto?")) return;
    try {
      await api.delete(`/projetos/${pid}`);
      navigate("/app/cadastros/projetos");
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao excluir.");
    }
  };

  const deleteCredito = async (id: number) => {
    if (!confirm("Excluir este Crédito Saldo?")) return;
    try {
      await api.delete(`/creditos-saldo/${id}`);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao excluir.");
    }
  };

  const deleteAcao = async (id: number) => {
    if (!confirm("Excluir esta Ação de Execução?")) return;
    try {
      await api.delete(`/acoes-execucao/${id}`);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao excluir.");
    }
  };

  const openHistorico = async (creditId: number) => {
    setHistCreditId(creditId);
    try {
      const r = await api.get(`/creditos-saldo/${creditId}/remanejamentos`);
      setHistRows(r.data);
    } catch {
      setHistRows([]);
    }
  };

  if (!data) {
    return (
      <div className="p-12 text-center text-slate-500">Carregando…</div>
    );
  }

  const canEdit = data.permissoes.edicaoFinanceira;
  const canRem = data.permissoes.remanejamento;

  return (
    <div className="space-y-6 animate-in fade-in max-w-5xl">
      <button
        type="button"
        onClick={() => navigate("/app/cadastros/projetos")}
        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800">
        <ArrowLeft size={18} /> Voltar aos projetos
      </button>

      <div className="flex items-start gap-4">
        <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg">
          <Briefcase size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            {data.project.nomeDoProjeto}
          </h1>
          <p className="text-xs font-black text-blue-600 uppercase tracking-widest">
            TED {data.project.numTed}
          </p>
        </div>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Saldo Orçamentário
          </p>
          <p className="text-2xl font-black text-slate-800 mt-1">
            {formatMoneyBRL(data.indicadores.saldoOrcamentario)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Referência do projeto (independente dos créditos)
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Saldo Crédito
          </p>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {formatMoneyBRL(data.indicadores.saldoCredito)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Σ créditos − Σ saldos por natureza
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Total Ações
          </p>
          <p className="text-2xl font-black text-indigo-700 mt-1">
            {formatMoneyBRL(data.indicadores.totalAcoes)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Soma dos saldos nas linhas de Crédito Saldo Natureza
          </p>
        </div>
      </div>

      {/* Formulário projeto */}
      <form
        onSubmit={saveProject}
        className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">
          Dados cadastrais
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Nome do Projeto
            </label>
            <input
              disabled={!canEdit}
              value={projForm.nomeDoProjeto}
              onChange={(e) =>
                setProjForm({ ...projForm, nomeDoProjeto: e.target.value })
              }
              className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Nº TED
            </label>
            <input
              disabled={!canEdit}
              value={projForm.numTed}
              onChange={(e) => setProjForm({ ...projForm, numTed: e.target.value })}
              className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Conta corrente
            </label>
            <input
              disabled={!canEdit}
              value={projForm.contaCorrente}
              onChange={(e) =>
                setProjForm({ ...projForm, contaCorrente: e.target.value })
              }
              className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Início
            </label>
            <input
              type="date"
              disabled={!canEdit}
              value={projForm.dtInicial}
              onChange={(e) =>
                setProjForm({ ...projForm, dtInicial: e.target.value })
              }
              className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Fim
            </label>
            <input
              type="date"
              disabled={!canEdit}
              value={projForm.dtFinal}
              onChange={(e) =>
                setProjForm({ ...projForm, dtFinal: e.target.value })
              }
              className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Saldo Orçamentário (R$)
            </label>
            <input
              type="number"
              step="0.01"
              disabled={!canEdit}
              value={projForm.saldo}
              onChange={(e) => setProjForm({ ...projForm, saldo: e.target.value })}
              className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 disabled:opacity-60"
            />
          </div>
        </div>
        {canEdit && (
          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={deleteProject}
              className="text-red-500 font-bold text-sm hover:underline">
              Excluir projeto
            </button>
            <button
              type="submit"
              className="bg-slate-900 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-600 transition-all">
              Salvar projeto
            </button>
          </div>
        )}
      </form>

      {/* Créditos */}
      <section className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setOpenCred(!openCred)}
          className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50">
          <span className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Wallet size={22} className="text-blue-600" /> Créditos (Crédito
            Saldo)
          </span>
          {openCred ? <ChevronDown /> : <ChevronRight />}
        </button>
        {openCred && (
          <div className="px-6 pb-6 space-y-4">
            {canEdit && (
              <button
                type="button"
                onClick={() => setCreditModal({ mode: "create" })}
                className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-xl text-sm">
                <Plus size={16} /> Novo crédito
              </button>
            )}
            {data.creditos.map((c) => (
              <div
                key={c.id}
                className="border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="text-xs text-slate-500">
                      Data de Creditação{" "}
                      <span className="font-bold text-slate-800">
                        {new Date(c.dataCredito).toLocaleDateString("pt-BR")}
                      </span>
                    </p>
                    <p className="text-lg font-black text-slate-900">
                      Valor: {formatMoneyBRL(c.valor)}{" "}
                      <span className="text-sm font-normal text-slate-500">
                        | Σ naturezas: {formatMoneyBRL(c.somaNaturezas)}
                      </span>
                    </p>
                    {c.notaCredito && (
                      <p className="text-sm text-slate-600">
                        Nota de Crédito: {c.notaCredito}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCreditModal({ mode: "edit", credit: c })
                        }
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCredito(c.id)}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-red-50 text-red-500">
                        <Trash2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openHistorico(c.id)}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1 text-xs font-bold">
                        <History size={16} /> Histórico
                      </button>
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                      <tr>
                        <th className="p-2 text-left">Natureza</th>
                        <th className="p-2 text-right">Saldo da Natureza</th>
                        <th className="p-2 text-right">Total vinculado às ações</th>
                        <th className="p-2 text-right">Saldo disponível</th>
                        {canRem && <th className="p-2 w-24"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {c.lines.map((ln) => (
                        <tr key={ln.id} className="border-t border-slate-100">
                          <td className="p-2">
                            {ln.expenseNature.nome}{" "}
                            <span className="text-slate-400">
                              ({ln.expenseNature.codigo})
                            </span>
                          </td>
                          <td className="p-2 text-right font-mono">
                            {formatMoneyBRL(ln.saldoNatureza)}
                          </td>
                          <td className="p-2 text-right font-mono text-amber-700">
                            {formatMoneyBRL(ln.totalVinculadoAcoes)}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-700">
                            {formatMoneyBRL(ln.saldoDisponivel)}
                          </td>
                          {canRem && (
                            <td className="p-2 text-right">
                              {Number(ln.saldoDisponivel) > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRemModal({
                                      creditId: c.id,
                                      line: ln,
                                    })
                                  }
                                  className="text-indigo-600 font-bold flex items-center gap-1 mx-auto">
                                  <Shuffle size={14} /> Remanejar
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {data.creditos.length === 0 && (
              <p className="text-slate-400 text-sm">Nenhum crédito cadastrado.</p>
            )}
          </div>
        )}
      </section>

      {/* Ações de execução */}
      <section className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setOpenAcoes(!openAcoes)}
          className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50">
          <span className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Briefcase size={22} className="text-indigo-600" /> Ações de Execução
          </span>
          {openAcoes ? <ChevronDown /> : <ChevronRight />}
        </button>
        {openAcoes && (
          <div className="px-6 pb-6 space-y-4">
            {canEdit && (
              <button
                type="button"
                onClick={() => setActionModal({ mode: "create" })}
                className="flex items-center gap-2 bg-indigo-600 text-white font-bold py-2 px-4 rounded-xl text-sm">
                <Plus size={16} /> Nova ação
              </button>
            )}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                  <tr>
                    <th className="p-3 text-left">Natureza</th>
                    <th className="p-3 text-left">Descrição</th>
                    <th className="p-3 text-right">Valor</th>
                    {canEdit && <th className="p-3 w-24"></th>}
                  </tr>
                </thead>
                <tbody>
                  {data.acoesExecucao.map((a) => (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="p-3">
                        {a.expenseNature.nome}{" "}
                        <span className="text-slate-400 text-xs">
                          ({a.expenseNature.codigo})
                        </span>
                      </td>
                      <td className="p-3">{a.descricao}</td>
                      <td className="p-3 text-right font-mono font-bold">
                        {formatMoneyBRL(a.valor)}
                      </td>
                      {canEdit && (
                        <td className="p-3">
                          <div className="flex gap-1 justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                setActionModal({ mode: "edit", action: a })
                              }
                              className="p-2 hover:bg-slate-100 rounded-lg">
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteAcao(a.id)}
                              className="p-2 hover:bg-red-50 text-red-500 rounded-lg">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.acoesExecucao.length === 0 && (
                <p className="p-6 text-center text-slate-400 text-sm">
                  Nenhuma ação cadastrada.
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {creditModal && (
        <CreditModal
          projectId={pid}
          naturezas={naturezas}
          mode={creditModal.mode}
          credit={creditModal.credit}
          onClose={() => setCreditModal(null)}
          onSaved={() => {
            setCreditModal(null);
            load();
          }}
        />
      )}

      {actionModal && (
        <ActionModal
          projectId={pid}
          naturezas={naturezas}
          mode={actionModal.mode}
          action={actionModal.action}
          onClose={() => setActionModal(null)}
          onSaved={() => {
            setActionModal(null);
            load();
          }}
        />
      )}

      {remModal && (
        <RemanejamentoModal
          creditId={remModal.creditId}
          line={remModal.line}
          naturezas={naturezas.filter((n) => n.id !== remModal.line.expenseNature.id)}
          onClose={() => setRemModal(null)}
          onSaved={() => {
            setRemModal(null);
            load();
          }}
        />
      )}

      {histCreditId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-black text-slate-800">
                Histórico de Remanejamentos de Crédito
              </h3>
              <button
                type="button"
                onClick={() => {
                  setHistCreditId(null);
                  setHistRows([]);
                }}
                className="text-slate-500 font-bold">
                Fechar
              </button>
            </div>
            <div className="overflow-auto p-4">
              <table className="w-full text-xs">
                <thead className="text-[10px] font-black uppercase text-slate-400">
                  <tr>
                    <th className="p-2 text-left">Data/hora</th>
                    <th className="p-2 text-left">Origem</th>
                    <th className="p-2 text-left">Destino</th>
                    <th className="p-2 text-right">Valor</th>
                    <th className="p-2 text-left">Usuário</th>
                    <th className="p-2 text-left">Obs.</th>
                  </tr>
                </thead>
                <tbody>
                  {histRows.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="p-2 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="p-2">{r.naturezaOrigem?.nome}</td>
                      <td className="p-2">{r.naturezaDestino?.nome}</td>
                      <td className="p-2 text-right font-mono">{formatMoneyBRL(r.valor)}</td>
                      <td className="p-2">{r.usuario ?? "—"}</td>
                      <td className="p-2">{r.observacao ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {histRows.length === 0 && (
                <p className="text-center text-slate-400 py-8">Nenhum registro.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreditModal({
  projectId,
  naturezas,
  mode,
  credit,
  onClose,
  onSaved,
}: {
  projectId: number;
  naturezas: NaturezaOpt[];
  mode: "create" | "edit";
  credit?: Credito;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [dataCredito, setDataCredito] = useState(
    credit ? credit.dataCredito.slice(0, 10) : new Date().toISOString().slice(0, 10),
  );
  const [valor, setValor] = useState(credit ? credit.valor : "");
  const [notaCredito, setNotaCredito] = useState(credit?.notaCredito ?? "");
  const [linhas, setLinhas] = useState<
    { expenseNatureId: number; saldoNatureza: string }[]
  >(
    credit
      ? credit.lines.map((l) => ({
          expenseNatureId: l.expenseNature.id,
          saldoNatureza: l.saldoNatureza,
        }))
      : [{ expenseNatureId: naturezas[0]?.id ?? 0, saldoNatureza: "" }],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        dataCredito: new Date(dataCredito).toISOString(),
        valor: parseFloat(valor),
        notaCredito: notaCredito || null,
        linhas: linhas.map((l) => ({
          expenseNatureId: l.expenseNatureId,
          saldoNatureza: parseFloat(l.saldoNatureza),
        })),
      };
      if (mode === "create") {
        await api.post(`/projetos/${projectId}/creditos-saldo`, payload);
      } else if (credit) {
        await api.patch(`/creditos-saldo/${credit.id}`, payload);
      }
      onSaved();
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao salvar crédito.");
    }
  };

  const addLine = () => {
    setLinhas([
      ...linhas,
      { expenseNatureId: naturezas[0]?.id ?? 0, saldoNatureza: "" },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4">
        <h3 className="font-black text-lg">
          {mode === "create" ? "Novo" : "Editar"} Crédito Saldo
        </h3>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase">
            Data de Creditação
          </label>
          <input
            type="date"
            required
            value={dataCredito}
            onChange={(e) => setDataCredito(e.target.value)}
            className="w-full mt-1 p-2 border rounded-xl"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase">
            Valor do Crédito
          </label>
          <input
            type="number"
            step="0.01"
            required
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-full mt-1 p-2 border rounded-xl"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase">
            Nota de Crédito (opcional)
          </label>
          <input
            value={notaCredito}
            onChange={(e) => setNotaCredito(e.target.value)}
            className="w-full mt-1 p-2 border rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase">
            Crédito Saldo Natureza
          </p>
          {linhas.map((ln, idx) => (
            <div key={idx} className="flex gap-2 items-end">
              <select
                value={ln.expenseNatureId}
                onChange={(e) => {
                  const next = [...linhas];
                  next[idx].expenseNatureId = Number(e.target.value);
                  setLinhas(next);
                }}
                className="flex-1 p-2 border rounded-xl text-sm">
                {naturezas.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.nome} ({n.codigo})
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                placeholder="Saldo"
                value={ln.saldoNatureza}
                onChange={(e) => {
                  const next = [...linhas];
                  next[idx].saldoNatureza = e.target.value;
                  setLinhas(next);
                }}
                className="w-32 p-2 border rounded-xl"
              />
              <button
                type="button"
                onClick={() => setLinhas(linhas.filter((_, i) => i !== idx))}
                className="p-2 text-red-500">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addLine}
            className="text-sm font-bold text-blue-600">
            + Linha
          </button>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border">
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold">
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}

function ActionModal({
  projectId,
  naturezas,
  mode,
  action,
  onClose,
  onSaved,
}: {
  projectId: number;
  naturezas: NaturezaOpt[];
  mode: "create" | "edit";
  action?: Acao;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [expenseNatureId, setExpenseNatureId] = useState(
    action?.expenseNature.id ?? naturezas[0]?.id ?? 0,
  );
  const [descricao, setDescricao] = useState(action?.descricao ?? "");
  const [valor, setValor] = useState(action ? action.valor : "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "create") {
        await api.post(`/projetos/${projectId}/acoes-execucao`, {
          expenseNatureId,
          descricao,
          valor: parseFloat(valor),
        });
      } else if (action) {
        await api.patch(`/acoes-execucao/${action.id}`, {
          expenseNatureId,
          descricao,
          valor: parseFloat(valor),
        });
      }
      onSaved();
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao salvar ação.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <h3 className="font-black text-lg">Ação de Execução</h3>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase">
            Natureza de Despesa
          </label>
          <select
            value={expenseNatureId}
            onChange={(e) => setExpenseNatureId(Number(e.target.value))}
            className="w-full mt-1 p-2 border rounded-xl">
            {naturezas.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase">
            Descrição da Ação de Execução
          </label>
          <textarea
            required
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full mt-1 p-2 border rounded-xl min-h-[80px]"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase">
            Valor
          </label>
          <input
            type="number"
            step="0.01"
            required
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-full mt-1 p-2 border rounded-xl"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border">
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold">
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}

function RemanejamentoModal({
  creditId,
  line,
  naturezas,
  onClose,
  onSaved,
}: {
  creditId: number;
  line: Line;
  naturezas: NaturezaOpt[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [destId, setDestId] = useState(naturezas[0]?.id ?? 0);
  const [valor, setValor] = useState("");
  const [obs, setObs] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destId || naturezas.length === 0) {
      alert("Selecione uma natureza de destino válida.");
      return;
    }
    try {
      await api.post(`/creditos-saldo/${creditId}/remanejamentos`, {
        linhaOrigemId: line.id,
        naturezaDestinoId: destId,
        valor: parseFloat(valor),
        observacao: obs || undefined,
      });
      onSaved();
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro no remanejamento.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <h3 className="font-black text-lg">Remanejamento de Crédito</h3>
        <p className="text-sm text-slate-600">
          Origem: <strong>{line.expenseNature.nome}</strong> — disponível:{" "}
          {formatMoneyBRL(line.saldoDisponivel)}
        </p>
        {naturezas.length === 0 ? (
          <p className="text-sm text-amber-700 font-medium">
            Não há outra natureza de destino cadastrada. Cadastre mais naturezas
            em <strong>Natureza de Despesa</strong>.
          </p>
        ) : (
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase">
            Natureza de destino
          </label>
          <select
            value={destId}
            onChange={(e) => setDestId(Number(e.target.value))}
            className="w-full mt-1 p-2 border rounded-xl">
            {naturezas.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nome} ({n.codigo})
              </option>
            ))}
          </select>
        </div>
        )}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase">
            Valor
          </label>
          <input
            type="number"
            step="0.01"
            required
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-full mt-1 p-2 border rounded-xl"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase">
            Observação (opcional)
          </label>
          <input
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            className="w-full mt-1 p-2 border rounded-xl"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={naturezas.length === 0}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-50">
            Confirmar remanejamento
          </button>
        </div>
      </form>
    </div>
  );
}
