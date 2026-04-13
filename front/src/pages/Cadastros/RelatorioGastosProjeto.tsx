import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { formatMoneyBRL } from "../../utils/formatMoney";
import { BarChart3, Calendar, FileText } from "lucide-react";

type Natureza = {
  id: number;
  nome: string;
  codigo: string;
  tipo: string;
  descricao: string | null;
};

type AcaoLinha = {
  id: number;
  descricao: string;
  valor: string;
  natureza: Natureza;
};

type Relatorio = {
  project: {
    id: number;
    nomeDoProjeto: string;
    numTed: string;
    contaCorrente: string;
    dtInicial: string;
    dtFinal: string;
    saldoOrcamentario: string;
    courseId: number | null;
  };
  acoes: AcaoLinha[];
  totaisPorNatureza: {
    expenseNatureId: number;
    nome: string;
    codigo: string;
    tipo: string;
    total: string;
  }[];
  totalGeral: string;
};

type ProjOpt = { id: number; nomeDoProjeto: string; numTed: string };

export default function RelatorioGastosProjeto() {
  const [projetos, setProjetos] = useState<ProjOpt[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [data, setData] = useState<Relatorio | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/projetos");
        setProjetos(r.data);
      } catch {
        setProjetos([]);
      }
    })();
  }, []);

  const carregar = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const r = await api.get(`/projetos/${projectId}/relatorio-gastos`);
      setData(r.data);
    } catch (e: any) {
      setError(e.response?.data?.error || "Erro ao gerar relatório.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center gap-4 mb-2">
        <div className="bg-emerald-600 p-3 rounded-2xl text-white shadow-lg">
          <BarChart3 size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Relatório de gastos por projeto
          </h1>
          <p className="text-sm text-slate-500">
            Ações de execução (gastos) detalhadas por natureza de despesa
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[240px]">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Projeto
          </label>
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setData(null);
            }}
            className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <option value="">Selecione…</option>
            {projetos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nomeDoProjeto} — TED {p.numTed}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={!projectId || loading}
          onClick={carregar}
          className="bg-slate-900 text-white font-bold py-3 px-8 rounded-xl hover:bg-emerald-700 disabled:opacity-50">
          {loading ? "A carregar…" : "Gerar relatório"}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <FileText size={18} /> Identificação do projeto
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Nome:</span>{" "}
                <strong>{data.project.nomeDoProjeto}</strong>
              </div>
              <div>
                <span className="text-slate-500">TED:</span>{" "}
                <strong>{data.project.numTed}</strong>
              </div>
              <div>
                <span className="text-slate-500">Conta corrente:</span>{" "}
                {data.project.contaCorrente}
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-slate-500">Período:</span>{" "}
                {new Date(data.project.dtInicial).toLocaleDateString("pt-BR")} —{" "}
                {new Date(data.project.dtFinal).toLocaleDateString("pt-BR")}
              </div>
              <div>
                <span className="text-slate-500">Saldo orçamentário (referência):</span>{" "}
                <strong>{formatMoneyBRL(data.project.saldoOrcamentario)}</strong>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <h2 className="p-4 text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              Total por natureza de despesa
            </h2>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                <tr>
                  <th className="p-3 text-left">Código</th>
                  <th className="p-3 text-left">Natureza</th>
                  <th className="p-3 text-left">Tipo</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.totaisPorNatureza.map((t) => (
                  <tr key={t.expenseNatureId} className="border-t border-slate-100">
                    <td className="p-3 font-mono text-xs">{t.codigo}</td>
                    <td className="p-3 font-medium">{t.nome}</td>
                    <td className="p-3">
                      {t.tipo === "NOTA" ? "Nota" : "Rendimento"}
                    </td>
                    <td className="p-3 text-right font-mono font-bold">
                      {formatMoneyBRL(t.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.totaisPorNatureza.length === 0 && (
              <p className="p-8 text-center text-slate-400">Sem ações registadas.</p>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <h2 className="p-4 text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              Detalhe — Ações de execução (gastos)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                  <tr>
                    <th className="p-3 text-left">ID</th>
                    <th className="p-3 text-left">Natureza (código)</th>
                    <th className="p-3 text-left">Nome natureza</th>
                    <th className="p-3 text-left">Tipo</th>
                    <th className="p-3 text-left">Descrição da ação</th>
                    <th className="p-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {data.acoes.map((a) => (
                    <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                      <td className="p-3 font-mono text-xs">{a.id}</td>
                      <td className="p-3 font-mono text-xs">{a.natureza.codigo}</td>
                      <td className="p-3">{a.natureza.nome}</td>
                      <td className="p-3">
                        {a.natureza.tipo === "NOTA" ? "Nota" : "Rendimento"}
                      </td>
                      <td className="p-3 max-w-md">{a.descricao}</td>
                      <td className="p-3 text-right font-mono font-semibold">
                        {formatMoneyBRL(a.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.acoes.length === 0 && (
              <p className="p-8 text-center text-slate-400">
                Nenhuma ação de execução para este projeto.
              </p>
            )}
          </section>

          <div className="flex justify-end bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
            <p className="text-lg font-black text-emerald-900">
              Total geral (ações de execução):{" "}
              <span className="text-2xl">{formatMoneyBRL(data.totalGeral)}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
