import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Briefcase,
  CheckCircle,
  Plane,
  Send,
  Users,
  MapPin,
  Calendar,
  Car,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import * as z from "zod";
import api from "../../services/api";
import { useAuthStore } from "../../store/authStore";

/** * SCHEMA DE VALIDAÇÃO (ZOD)
 * Define as regras de negócio e tipos para o formulário
 */
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
    // Apenas informativo: o curso da solicitação é o do solicitante logado
    courseId: z.string().optional(),
    agentIds: z.array(z.string()).min(1, "Selecione pelo menos um passageiro"),
    meioTransporte: z.enum(["AEREO", "TERRESTRE", "FLUVIAL"]),
    tipoViagem: z.enum(["NACIONAL", "INTERNACIONAL"]),
    tipoVeiculo: z.string().optional(),
    condutor: z.string().optional(),
    placaVeiculo: z.string().optional(),
    bilhete: z.string().optional(),
  })
  .refine((data) => new Date(data.dataIda) < new Date(data.dataVolta), {
    message: "A data de volta deve ser posterior à data de ida",
    path: ["dataVolta"],
  });

type FormData = z.infer<typeof schema>;

// Converte uma data ISO para o formato do input datetime-local (horário local)
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function NewSolicitation() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  // Com :id na rota, a tela corrige e reenvia uma solicitação devolvida
  const { id: editId } = useParams();
  const [devolucao, setDevolucao] = useState<string | null>(null);

  // ESTADOS DE CONTROLE
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ESTADOS DE DADOS (OPÇÕES DOS SELECTS)
  const [projetos, setProjetos] = useState<any[]>([]);
  const [tiposDiaria, setTiposDiaria] = useState<any[]>([]);
  const [objetivos, setObjetivos] = useState<any[]>([]);
  const [agentes, setAgentes] = useState<any[]>([]);
  const [destinos, setDestinos] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);

  /**
   * CONFIGURAÇÃO DO FORMULÁRIO
   */
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      meioTransporte: "AEREO",
      tipoViagem: "NACIONAL",
      agentIds: [],
    },
  });

  // Observa o meio de transporte para mostrar campos condicionais
  const watchTransporte = watch("meioTransporte");

  /**
   * CARREGAMENTO DE DADOS INICIAIS
   */
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
          agentesRes.data.filter((u: any) => u.roles?.includes("AGENTE")),
        );
        setDestinos(destRes.data);
        setCursos(cursosRes.data);

        if (user?.courseId) {
          setValue("courseId", String(user.courseId));
        }

        if (editId) {
          const { data: sol } = await api.get(`/solicitacoes/${editId}`);
          const first = sol.details?.[0] ?? {};
          setDevolucao(sol.observacaoDevolucao ?? null);
          reset({
            motivo: sol.motivoSolicitacao,
            origem: sol.origem,
            destino: sol.destino,
            dataIda: toLocalInput(sol.dataIda),
            dataVolta: toLocalInput(sol.dataVolta),
            projetoId: String(first.projectId ?? ""),
            tipoDiariaId: String(first.dailyRateTypeId ?? ""),
            objectiveId: String(first.objectiveId ?? ""),
            agentIds: sol.details.map((d: any) => String(d.agentId)),
            meioTransporte: first.meioTransporte ?? "AEREO",
            tipoViagem: first.tipoViagem ?? "NACIONAL",
            tipoVeiculo: first.tipoVeiculo ?? "",
            condutor: first.condutor ?? "",
            placaVeiculo: first.placaVeiculo ?? "",
            courseId: user?.courseId ? String(user.courseId) : undefined,
          });
        }
      } catch (error) {
        console.error("Erro ao carregar opções", error);
      }
    };
    loadOptions();
  }, [user, setValue, reset, editId]);

  /**
   * REGRAS DE CÁLCULO
   */
  const calcularDiarias = (ida: string, volta: string) => {
    const dataIda = new Date(ida);
    const dataVolta = new Date(volta);
    const diffTime = Math.abs(dataVolta.getTime() - dataIda.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 3.5 ? 3.5 : diffDays;
  };

  /**
   * SUBMISSÃO DO FORMULÁRIO
   */
  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccess(false);

    try {
      const isTerrestre = data.meioTransporte === "TERRESTRE";
      const { courseId, ...rest } = data;
      const payload = {
        ...rest,
        qtdDiarias: calcularDiarias(data.dataIda, data.dataVolta),
        agentIds: data.agentIds.map((id) => Number(id)),
        projetoId: Number(data.projetoId),
        tipoDiariaId: Number(data.tipoDiariaId),
        objectiveId: Number(data.objectiveId),
        // Dados de veículo só se aplicam ao transporte terrestre
        tipoVeiculo: isTerrestre ? data.tipoVeiculo || null : null,
        condutor: isTerrestre ? data.condutor || null : null,
        placaVeiculo: isTerrestre ? data.placaVeiculo || null : null,
      };

      if (editId) {
        await api.put(`/solicitacoes/${editId}`, payload);
        alert("Solicitação corrigida e reenviada para a Direção.");
        navigate("/app/solicitacoes");
        return;
      }

      await api.post("/solicitacoes", payload);
      setSuccess(true);
      reset({
        meioTransporte: "AEREO",
        tipoViagem: "NACIONAL",
        agentIds: [],
        courseId,
      });
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
      {/* --- BLOCO: CABEÇALHO --- */}
      <div className="flex items-center gap-4 mb-2">
        <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-600/20">
          <Plane size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {editId ? `Corrigir Solicitação #${editId}` : "Nova Viagem"}
          </h1>
          <p className="text-slate-500 font-medium">
            Configure a objetivo da viagem e os agentes.
          </p>
        </div>
      </div>

      {devolucao && (
        <div className="bg-amber-50 border-2 border-amber-100 p-6 rounded-3xl text-amber-800">
          <p className="font-black text-sm uppercase tracking-widest mb-1">Motivo da devolução</p>
          <p className="text-sm font-medium">{devolucao}</p>
        </div>
      )}

      {/* --- BLOCO: FEEDBACK (ERRO/SUCESSO) --- */}
      {errorMsg && (
        <div className="bg-red-50 border-2 border-red-100 p-6 rounded-3xl flex items-start gap-4 text-red-700">
          <AlertCircle className="shrink-0 mt-1" size={24} />
          <div>
            <p className="font-black text-lg text-red-800">Atenção</p>
            <p className="text-sm font-medium">{errorMsg}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-3xl flex items-start gap-4 text-emerald-700">
          <CheckCircle className="shrink-0 mt-1" size={24} />
          <div>
            <p className="font-black text-lg text-emerald-800">Sucesso!</p>
            <p className="text-sm font-medium">
              Solicitação enviada para análise.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* --- BLOCO 1: LOGÍSTICA E TRANSPORTE --- */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <MapPin size={14} /> Logística de Viagem
          </h3>

          {/* Seleção de Curso */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
              Curso / Departamento
            </label>
            <select
              {...register("courseId")}
              disabled
              className="w-full border rounded-xl p-3 text-sm font-bold outline-none transition-all bg-slate-100 text-slate-500">
              <option value="">Selecione o curso...</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Rota (Origem e Destino) */}
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

          {/* Datas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
                <Calendar size={12} /> Saída
              </label>
              <input
                type="datetime-local"
                {...register("dataIda")}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
                <Calendar size={12} /> Retorno
              </label>
              <input
                type="datetime-local"
                {...register("dataVolta")}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold"
              />
            </div>
          </div>

          {/* Meio de Transporte */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Meio de Transporte
              </label>
              <select
                {...register("meioTransporte")}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold">
                <option value="AEREO">Aéreo</option>
                <option value="TERRESTRE">Terrestre</option>
                <option value="FLUVIAL">Fluvial</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Tipo de Viagem
              </label>
              <select
                {...register("tipoViagem")}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold">
                <option value="NACIONAL">Nacional</option>
                <option value="INTERNACIONAL">Internacional</option>
              </select>
            </div>

            {/* Condicional: Veículo Terrestre */}
            {watchTransporte === "TERRESTRE" && (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-600 uppercase ml-1 flex items-center gap-1">
                    <Car size={12} /> Veículo
                  </label>
                  <select
                    {...register("tipoVeiculo")}
                    className="w-full bg-white border border-blue-200 rounded-xl p-3 text-sm font-bold">
                    <option value="OFICIAL">Oficial</option>
                    <option value="PROPRIO">Próprio</option>
                    <option value="ALUGADO">Alugado</option>
                    <option value="PUBLICO">Público</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-600 uppercase ml-1">
                    Condutor
                  </label>
                  <input
                    {...register("condutor")}
                    placeholder="Nome do motorista"
                    className="w-full bg-white border border-blue-200 rounded-xl p-3 text-sm font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-600 uppercase ml-1">
                    Placa
                  </label>
                  <input
                    {...register("placaVeiculo")}
                    placeholder="ABC-1234"
                    className="w-full bg-white border border-blue-200 rounded-xl p-3 text-sm font-bold"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- BLOCO 2: CLASSIFICAÇÃO FINANCEIRA --- */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Briefcase size={14} /> Classificação Orçamentária
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Projeto
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
                Diária
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
              Justificativa da Viagem
            </label>
            <textarea
              {...register("motivo")}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium min-h-[100px] outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descreva detalhadamente o propósito da viagem..."
            />
            {errors.motivo && (
              <p className="text-red-500 text-[10px] font-bold">
                {errors.motivo.message}
              </p>
            )}
          </div>
        </div>

        {/* --- BLOCO 3: AGENTES --- */}
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
                  className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-blue-500 transition-colors shadow-sm">
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
          {errors.agentIds && (
            <p className="text-red-500 text-[10px] font-bold">
              {errors.agentIds.message}
            </p>
          )}
        </div>

        {/* Resumo de erros de validação (campos sem mensagem própria) */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-2xl text-xs font-bold space-y-1">
            {Object.entries(errors).map(([field, err]) => (
              <p key={field}>• {err?.message as string}</p>
            ))}
          </div>
        )}

        {/* --- BOTÃO DE SUBMISSÃO --- */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-blue-600 transition-all flex justify-center items-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50">
          {loading ? (
            "Processando..."
          ) : (
            <>
              <Send size={18} /> {editId ? "Reenviar Solicitação" : "Submeter Solicitação"}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
