import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { Download, FileUp, Layers, Plus, Trash2, Pencil } from "lucide-react";

const NATUREZAS_CSV_SAMPLE = [
  "codigo;nome;tipo;descricao",
  "EX-NOTA-001;Exemplo despesa com nota fiscal;NOTA;Texto opcional da descrição",
  "EX-REND-001;Exemplo rendimento;RENDIMENTO;",
].join("\r\n");

function downloadNaturezasCsvSample() {
  const blob = new Blob(["\uFEFF", NATUREZAS_CSV_SAMPLE], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modelo-naturezas-despesa.csv";
  a.click();
  URL.revokeObjectURL(url);
}

type Natureza = {
  id: number;
  nome: string;
  descricao: string | null;
  codigo: string;
  tipo: "NOTA" | "RENDIMENTO";
};

const emptyForm: {
  nome: string;
  descricao: string;
  codigo: string;
  tipo: "NOTA" | "RENDIMENTO";
} = {
  nome: "",
  descricao: "",
  codigo: "",
  tipo: "NOTA",
};

export default function NaturezasDespesa() {
  const [items, setItems] = useState<Natureza[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const load = async () => {
    try {
      setItems((await api.get("/naturezas-despesa")).data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (n: Natureza) => {
    setEditingId(n.id);
    setForm({
      nome: n.nome,
      descricao: n.descricao ?? "",
      codigo: n.codigo,
      tipo: n.tipo,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        nome: form.nome,
        descricao: form.descricao || null,
        codigo: form.codigo.trim(),
        tipo: form.tipo,
      };
      if (editingId) {
        await api.patch(`/naturezas-despesa/${editingId}`, payload);
      } else {
        await api.post("/naturezas-despesa", payload);
      }
      cancelEdit();
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  const importarCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      const csv = await file.text();
      const { data } = await api.post("/naturezas-despesa/importar-csv", { csv });
      const msg = [
        `Inseridas: ${data.criadas}`,
        `Ignoradas (código duplicado): ${data.ignoradas}`,
        ...(data.erros?.length ? ["\nAvisos:\n" + data.erros.join("\n")] : []),
      ].join("\n");
      alert(msg);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro na importação.");
    } finally {
      setImporting(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Excluir esta Natureza de Despesa?")) return;
    try {
      await api.delete(`/naturezas-despesa/${id}`);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao excluir.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg">
          <Layers size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Natureza de Despesa
          </h1>
          <p className="text-sm text-slate-500">
            Catálogo global — código único no sistema
          </p>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 space-y-4">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">
          {editingId ? "Editar" : "Nova"} natureza
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Nome
            </label>
            <input
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Código (único)
            </label>
            <input
              required
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Descrição
            </label>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 min-h-[80px]"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Tipo
            </label>
            <select
              value={form.tipo}
              onChange={(e) =>
                setForm({
                  ...form,
                  tipo: e.target.value as "NOTA" | "RENDIMENTO",
                })
              }
              className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <option value="NOTA">Nota</option>
              <option value="RENDIMENTO">Rendimento</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="px-6 py-3 rounded-xl border border-slate-200 font-bold text-slate-600">
              Cancelar
            </button>
          )}
          <button
            disabled={loading}
            type="submit"
            className="bg-slate-900 text-white font-bold py-3 px-8 rounded-xl hover:bg-indigo-600 transition-all flex items-center gap-2">
            <Plus size={18} /> {editingId ? "Atualizar" : "Cadastrar"}
          </button>
        </div>
      </form>

      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-dashed border-indigo-200">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
          <FileUp size={18} className="text-indigo-600" /> Importar CSV
        </h2>
        <p className="text-xs text-slate-600 mb-3">
          Primeira linha: cabeçalho com colunas{" "}
          <code className="bg-slate-100 px-1 rounded">codigo</code>,{" "}
          <code className="bg-slate-100 px-1 rounded">nome</code>,{" "}
          <code className="bg-slate-100 px-1 rounded">tipo</code> (NOTA ou RENDIMENTO), opcionalmente{" "}
          <code className="bg-slate-100 px-1 rounded">descricao</code>. Separador{" "}
          <strong>;</strong> ou <strong>,</strong>. Codigos duplicados são ignorados.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={downloadNaturezasCsvSample}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-800 text-sm font-bold hover:bg-indigo-100">
            <Download size={18} />
            Baixar modelo (.csv)
          </button>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold cursor-pointer hover:bg-indigo-700">
            {importing ? "A importar…" : "Escolher ficheiro .csv"}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={importing}
              onChange={importarCsv}
            />
          </label>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">
            <tr>
              <th className="p-4">Código</th>
              <th className="p-4">Nome</th>
              <th className="p-4">Tipo</th>
              <th className="p-4 w-28"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((n) => (
              <tr key={n.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                <td className="p-4 font-mono text-xs">{n.codigo}</td>
                <td className="p-4 font-medium text-slate-800">{n.nome}</td>
                <td className="p-4">{n.tipo === "NOTA" ? "Nota" : "Rendimento"}</td>
                <td className="p-4 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => startEdit(n)}
                    className="p-2 text-slate-400 hover:text-indigo-600">
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(n.id)}
                    className="p-2 text-slate-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="p-8 text-center text-slate-400">Nenhuma natureza cadastrada.</p>
        )}
      </div>
    </div>
  );
}
