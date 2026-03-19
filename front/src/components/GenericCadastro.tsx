import { AlertCircle, Plus, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import api from "../services/api";

interface GenericProps {
  title: string;
  endpoint: string;
  fieldName: string;
  label: string;
  icon: React.ReactNode;
}

export default function GenericCadastro({
  title,
  endpoint,
  fieldName,
  label,
  icon,
}: GenericProps) {
  const [items, setItems] = useState<any[]>([]);
  const { register, handleSubmit, reset } = useForm();
  const [loading, setLoading] = useState(false);

  const loadItems = async () => {
    try {
      const res = await api.get(`/${endpoint}`);
      setItems(res.data);
    } catch (error) {
      console.error(`Erro ao carregar ${title}`);
    }
  };

  // 1. CORREÇÃO: Adicionamos 'reset' e 'fieldName' aqui
  // Isso garante que se você mudar de 'Bancos' para 'Objetivos', o campo 'nome' antigo é apagado
  useEffect(() => {
    reset();
    loadItems();
  }, [endpoint, fieldName]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      // 2. CORREÇÃO: Criação do payload limpo
      // Em vez de enviar 'data' (que pode ter lixo), criamos um objeto novo só com o campo necessário
      const payload = { [fieldName]: data[fieldName] };

      await api.post(`/${endpoint}`, payload);
      reset();
      loadItems();
    } catch (error) {
      alert(
        "Erro ao salvar. Verifique se já não existe um registro com este nome.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    try {
      await api.delete(`/${endpoint}/${id}`);
      loadItems();
    } catch (error) {
      alert("Erro ao deletar.");
    }
  };

  // ... (O resto do return/JSX continua igual ao que você já tem)
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-200">
          {icon}
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {title}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 sticky top-6">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">
              Novo Registro
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                  {label}
                </label>
                <input
                  {...register(fieldName)}
                  required
                  className="w-full mt-2 p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  placeholder={`Digite o ${label.toLowerCase()}...`}
                />
              </div>
              <button
                disabled={loading}
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-blue-600 transition-all flex justify-center gap-2 shadow-xl">
                {loading ? (
                  "Salvando..."
                ) : (
                  <>
                    <Plus size={20} /> Cadastrar
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Registros Encontrados: {items.length}
              </span>
            </div>
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 hover:bg-slate-50 flex justify-between items-center group transition-colors">
                  <span className="font-bold text-slate-700">
                    {item[fieldName]}
                  </span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {items.length === 0 && (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                  <AlertCircle size={32} className="text-slate-200" />
                  <p>Nenhum registro encontrado.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
