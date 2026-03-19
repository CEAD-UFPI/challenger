import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import api from "../../services/api";
import { UserCog, Plus, Trash2, Link as LinkIcon } from "lucide-react";

export default function Solicitants() {
  const [solicitants, setSolicitants] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const { register, handleSubmit, reset } = useForm();
  const [loading, setLoading] = useState(false);

  // Carrega os dados iniciais
  const loadData = async () => {
    try {
      const [sData, uData, cData] = await Promise.all([
        api.get("/solicitantes"),
        api.get("/users"),
        api.get("/cursos"),
      ]);
      setSolicitants(sData.data);
      setUsers(uData.data);
      setCourses(cData.data);
    } catch (err) {
      console.error("Erro ao carregar dados", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Salvar novo vínculo
  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      await api.post("/solicitantes", data);
      reset();
      loadData();
    } catch (e) {
      alert("Erro: Verifique se este vínculo já não existe.");
    } finally {
      setLoading(false);
    }
  };

  // Deletar vínculo
  const handleDelete = async (id: number) => {
    if (confirm("Remover este vínculo de solicitante?")) {
      try {
        await api.delete(`/solicitantes/${id}`);
        loadData();
      } catch (e) {
        alert("Erro ao deletar.");
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-orange-500 p-3 rounded-2xl text-white shadow-lg">
          <UserCog size={28} />
        </div>
        <h1 className="text-2xl font-black text-slate-900">
          Solicitantes de Curso
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário */}
        <div className="lg:col-span-1">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 sticky top-6">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">
              Vincular Responsável
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                  Usuário
                </label>
                <select
                  {...register("userId")}
                  required
                  className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <option value="">Selecione o Usuário...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center text-slate-300">
                <LinkIcon size={20} />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                  Curso / Departamento
                </label>
                <select
                  {...register("courseId")}
                  required
                  className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <option value="">Selecione o Curso...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <button
                disabled={loading}
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-orange-500 transition-all flex justify-center gap-2 shadow-xl">
                {loading ? (
                  "Vinculando..."
                ) : (
                  <>
                    <Plus size={20} /> Vincular
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Lista */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between">
              <span className="font-bold text-xs text-slate-400 uppercase tracking-widest">
                Vínculos Ativos
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {solicitants.map((s) => (
                <div
                  key={s.id}
                  className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                      {s.user?.firstName?.[0]}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">
                        {s.user?.firstName} {s.user?.lastName}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">
                        Responsável por:{" "}
                        <span className="text-orange-600">
                          {s.course?.nome}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {solicitants.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  Nenhum solicitante vinculado.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
