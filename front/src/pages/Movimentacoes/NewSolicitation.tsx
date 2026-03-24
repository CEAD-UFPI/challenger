import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Briefcase,
  CheckCircle,
  Plane,
  Send,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import api from "../../services/api";
import { useAuthStore } from "../../store/authStore";

const schema = z
  .object({
    motivo: z
      .string()
      .min(10, "A justificativa deve ter pelo menos 10 caracteres"),
    origem: z.string().min(1, "Origem é obrigatória"),
    destino: z.string().min(1, "Destino é obrigatório"),
    dataIda: z.string().min(1, "Data de ida é obrigatória"),
    dataVolta: z.string().min(1, "Data de volta é obrigatória"),
    projetoId: z.string().min(1, "Selecione o projeto"),
    tipoDiariaId: z.string().min(1, "Selecione o tipo de diária"),
    objectiveId: z.string().min(1, "Selecione o objetivo"),
    courseId: z.string().min(1, "O curso é obrigatório"), // Adicionado curso ao schema
    agentIds: z.array(z.string()).min(1, "Selecione pelo menos um passageiro"),
  })
  .refine((data) => new Date(data.dataIda) < new Date(data.dataVolta), {
    message: "A data de volta deve ser posterior à data de ida",
    path: ["dataVolta"],
  });

type FormData = z.infer<typeof schema>;

export default function NewSolicitation() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [projetos, setProjetos] = useState<any[]>([]);
  const [tiposDiaria, setTiposDiaria] = useState<any[]>([]);
  const [objetivos, setObjetivos] = useState<any[]>([]);
  const [agentes, setAgentes] = useState<any[]>([]);
  const [destinos, setDestinos] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [projRes, tiposRes, objRes, agentesRes, destRes, cursosRes] =
          await Promise.all([
            api.get("/projetos"),
            api.get("/tipos-diaria"),
            api.get("/objetivos"),
            api.get("/users"),
            api.get("/destinos"),
            api.get("/cursos"),
          ]);
        setProjetos(projRes.data);
        setTiposDiaria(tiposRes.data);
        setObjetivos(objRes.data);
        setAgentes(
          agentesRes.data.filter((u: any) => u.roles.includes("AGENTE")),
        );
        setDestinos(destRes.data);
        setCursos(cursosRes.data);

        // Preenchimento automático do curso para Solicitantes
        if (user && !user.roles.includes("ADMIN")) {
          setValue("courseId", String(user.courseId));
        }
      } catch (error) {
        console.error("Erro ao carregar opções do formulário", error);
      }
    };
    loadOptions();
  }, [user, setValue]);

  const calcularDiarias = (ida: string, volta: string) => {
    const dataIda = new Date(ida);
    const dataVolta = new Date(volta);
    const diffTime = Math.abs(dataVolta.getTime() - dataIda.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 3.5 ? 3.5 : diffDays; // Limite de 3.5 diárias
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccess(false);

    try {
      const payload = {
        ...data,
        requesterId: user?.id,
        qtdDiarias: calcularDiarias(data.dataIda, data.dataVolta),
        agentIds: data.agentIds.map((id) => Number(id)),
        projetoId: Number(data.projetoId),
        tipoDiariaId: Number(data.tipoDiariaId),
        objectiveId: Number(data.objectiveId),
        courseId: Number(data.courseId),
      };

      await api.post("/solicitacoes", payload);
      setSuccess(true);
      reset();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.error || "Erro ao processar solicitação.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header e Alertas de Feedback */}
      <div className="flex items-center gap-4 mb-2">
        <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-600/20">
          <Plane size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Nova Viagem
          </h1>
          <p className="text-slate-500 font-medium">
            Configure a missão institucional e os viajantes.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border-2 border-red-100 p-6 rounded-3xl flex items-start gap-4 text-red-700">
          <AlertCircle className="shrink-0 mt-1" size={24} />
          <div>
            <p className="font-black text-lg">Atenção</p>
            <p className="text-sm font-medium">{errorMsg}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-3xl flex items-start gap-4 text-emerald-700">
          <CheckCircle className="shrink-0 mt-1" size={24} />
          <div>
            <p className="font-black text-lg">Sucesso!</p>
            <p className="text-sm font-medium">
              Solicitação enviada para análise.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Bloco 1: Rota, Datas e Curso */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Plane size={14} /> Detalhes Logísticos
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Curso / Departamento
              </label>
              <select
                {...register("courseId")}
                disabled={!user?.roles.includes("ADMIN")}
                className={`w-full border rounded-xl p-3 text-sm font-bold outline-none transition-all ${
                  !user?.roles.includes("ADMIN")
                    ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                    : "bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-500"
                }`}>
                <option value="">Selecione o curso...</option>
                {cursos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Origem
              </label>
              <select
                {...register("origem")}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Selecione...</option>
                {destinos.map((d) => (
                  <option key={`ori-${d.id}`} value={d.nome}>
                    {d.nome} - {d.estado}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Destino
              </label>
              <select
                {...register("destino")}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Selecione...</option>
                {destinos.map((d) => (
                  <option key={`dest-${d.id}`} value={d.nome}>
                    {d.nome} - {d.estado}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Data/Hora Saída
              </label>
              <input
                type="datetime-local"
                {...register("dataIda")}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Data/Hora Retorno
              </label>
              <input
                type="datetime-local"
                {...register("dataVolta")}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold"
              />
            </div>
          </div>
        </div>

        {/* Bloco 2: Vínculos Financeiros */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Briefcase size={14} /> Classificação Orçamentária
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Projeto Vinculado
              </label>
              <select
                {...register("projetoId")}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Selecione o projeto...</option>
                {projetos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nomeDoProjeto} {p.numTed ? `(TED: ${p.numTed})` : ""}
                  </option>
                ))}
              </select>
              {errors.projetoId && (
                <p className="text-red-500 text-xs font-bold">
                  {errors.projetoId.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Objetivo
              </label>
              <select
                {...register("objectiveId")}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold">
                <option value="">Selecione...</option>
                {objetivos.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.objetivo}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Tipo Diária
              </label>
              <select
                {...register("tipoDiariaId")}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold">
                <option value="">Selecione...</option>
                {tiposDiaria.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
              Justificativa
            </label>
            <textarea
              {...register("motivo")}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium min-h-[100px] outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descreva o propósito da viagem..."
            />
          </div>
        </div>

        {/* Bloco 3: Seleção de Agentes com Nome Social */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Users size={14} /> Agentes Selecionados
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto p-2 bg-slate-50 rounded-xl">
            {agentes.map((agente) => {
              const nomeExibicao =
                agente.nomeSocial || `${agente.firstName} ${agente.lastName}`;
              return (
                <label
                  key={agente.id}
                  className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-blue-500 transition-colors">
                  <input
                    type="checkbox"
                    value={agente.id}
                    {...register("agentIds")}
                    className="w-5 h-5 text-blue-600 rounded mt-1"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-700">
                      {nomeExibicao}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      CPF:{" "}
                      {agente.cpf?.replace(
                        /(\d{3})(\d{3})(\d{3})(\d{2})/,
                        "$1.$2.$3-$4",
                      )}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-blue-600 transition-all flex justify-center items-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50">
          {loading ? (
            "Processando..."
          ) : (
            <>
              <Send size={18} /> Submeter Solicitação
            </>
          )}
        </button>
      </form>
    </div>
  );
}
