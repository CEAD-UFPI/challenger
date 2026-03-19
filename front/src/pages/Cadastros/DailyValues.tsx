import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import api from "../../services/api";
import { Banknote, Trash2, Plus } from "lucide-react";

export default function DailyValues() {
  const [items, setItems] = useState<any[]>([]);
  const { register, handleSubmit, reset } = useForm();
  const [loading, setLoading] = useState(false);

  const load = async () => setItems((await api.get("/tipos-diaria")).data);
  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      await api.post("/tipos-diaria", {
        ...data,
        valor: parseFloat(data.valor),
      });
      reset();
      load();
    } catch (e) {
      alert("Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Excluir?")) {
      await api.delete(`/tipos-diaria/${id}`);
      load();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-green-600 p-3 rounded-2xl text-white shadow-lg">
          <Banknote size={28} />
        </div>
        <h1 className="text-2xl font-black text-slate-900">
          Tabela de Diárias
        </h1>
      </div>

      <div className="flex gap-6">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white p-6 rounded-3xl h-fit shadow-sm border border-slate-200 w-1/3">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">
                Descrição
              </label>
              <input
                {...register("nome")}
                required
                className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200"
                placeholder="Ex: Diária Nacional - Professor"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">
                Valor (R$)
              </label>
              <input
                type="number"
                step="0.01"
                {...register("valor")}
                required
                className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200"
                placeholder="0.00"
              />
            </div>
            <button
              disabled={loading}
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-green-600 transition-all">
              <Plus size={18} className="inline mr-2" /> Adicionar
            </button>
          </div>
        </form>

        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase font-black text-xs">
              <tr>
                <th className="p-4">Tipo</th>
                <th className="p-4">Valor</th>
                <th className="p-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="p-4 font-medium">{i.nome}</td>
                  <td className="p-4 font-black text-green-600">
                    R$ {Number(i.valor).toFixed(2)}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDelete(i.id)}
                      className="text-red-400 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
