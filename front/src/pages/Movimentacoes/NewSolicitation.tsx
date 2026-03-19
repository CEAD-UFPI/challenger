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
import api from "../../services/api"; // Ajuste o caminho do import da API se necessário
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

  // Estados para guardar os dados do banco
  const [projetos, setProjetos] = useState<any[]>([]);
  const [tiposDiaria, setTiposDiaria] = useState<any[]>([]);
  const [objetivos, setObjetivos] = useState<any[]>([]);
  const [agentes, setAgentes] = useState<any[]>([]);
  const [destinos, setDestinos] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // Carrega as listas de opções ao abrir a tela
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [projRes, tiposRes, objRes, agentesRes, destRes] =
          await Promise.all([
            api.get("/projetos"),
            api.get("/tipos-diaria"),
            api.get("/objetivos"),
            api.get("/users"), // Vai trazer só os agentes do curso do solicitante (Filtro do Backend)
            api.get("/destinos"),
          ]);
        setProjetos(projRes.data);
        setTiposDiaria(tiposRes.data);
        setObjetivos(objRes.data);
        // Filtra para mostrar apenas passageiros na lista (sem admins/financeiro)
        setAgentes(
          agentesRes.data.filter((u: any) => u.roles.includes("AGENTE")),
        );
        setDestinos(destRes.data);
      } catch (error) {
        console.error("Erro ao carregar opções do formulário", error);
      }
    };
    loadOptions();
  }, []);

  const calcularDiarias = (ida: string, volta: string) => {
    const dataIda = new Date(ida);
    const dataVolta = new Date(volta);
    const diffTime = Math.abs(dataVolta.getTime() - dataIda.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccess(false);

    try {
      const payload = {
        requesterId: user?.id,
        motivo: data.motivo,
        origem: data.origem,
        destino: data.destino,
        dataIda: data.dataIda,
        dataVolta: data.dataVolta,
        projetoId: data.projetoId,
        tipoDiariaId: data.tipoDiariaId,
        objectiveId: data.objectiveId,
        qtdDiarias: calcularDiarias(data.dataIda, data.dataVolta),
        // Converte os IDs selecionados para números
        agentIds: data.agentIds.map((id) => Number(id)),
      };

      await api.post("/solicitacoes", payload);
      setSuccess(true);
      reset();
      window.scrollTo(0, 0);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setErrorMsg("🚫 " + err.response.data.error); // Mensagem de bloqueio do backend
      } else {
        setErrorMsg(
          "Ocorreu um erro ao processar sua solicitação. Verifique os dados.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-2">
        <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-600/20">
          <Plane size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Nova Viagem
          </h1>
          <p className="text-slate-500 font-medium">
            Preencha os dados operacionais da missão.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border-2 border-red-100 p-6 rounded-3xl flex items-start gap-4 text-red-700 shadow-xl shadow-red-100/50">
          <AlertCircle className="shrink-0 mt-1" size={24} />
          <div>
            <p className="font-black text-lg leading-tight mb-1">Atenção</p>
            <p className="text-sm font-medium opacity-90">{errorMsg}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-3xl flex items-start gap-4 text-emerald-700 shadow-xl shadow-emerald-100/50">
          <CheckCircle className="shrink-0 mt-1" size={24} />
          <div>
            <p className="font-black text-lg leading-tight mb-1">Sucesso!</p>
            <p className="text-sm font-medium opacity-90">
              Solicitação enviada para análise da Direção.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Bloco 1: Rota e Datas */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Plane size={14} /> Rota e Datas
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Origem (Texto)
              </label>
              <input
                {...register("origem")}
                placeholder="Ex: Teresina - PI"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.origem && (
                <p className="text-red-500 text-xs font-bold">
                  {errors.origem.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Destino (Cidade)
              </label>
              <select
                {...register("destino")}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Selecione...</option>
                {destinos.map((d) => (
                  <option key={d.id} value={d.nome}>
                    {d.nome} - {d.estado}
                  </option>
                ))}
              </select>
              {errors.destino && (
                <p className="text-red-500 text-xs font-bold">
                  {errors.destino.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Saída
              </label>
              <input
                type="datetime-local"
                {...register("dataIda")}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold"
              />
              {errors.dataIda && (
                <p className="text-red-500 text-xs font-bold">
                  {errors.dataIda.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Retorno
              </label>
              <input
                type="datetime-local"
                {...register("dataVolta")}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold"
              />
              {errors.dataVolta && (
                <p className="text-red-500 text-xs font-bold">
                  {errors.dataVolta.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bloco 2: Vínculos (Projeto, Tipo Diária) */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Briefcase size={14} /> Finalidade e Recursos
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Projeto Vinculado
              </label>
              <select
                {...register("projetoId")}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold">
                <option value="">Selecione...</option>
                {projetos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nomeDoProjeto}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Objetivo da Viagem
              </label>
              <select
                {...register("objectiveId")}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold">
                <option value="">Selecione...</option>
                {objetivos.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Tipo de Pagamento
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
              Justificativa da Missão
            </label>
            <textarea
              {...register("motivo")}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium min-h-[100px] outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descreva detalhadamente o motivo..."
            />
            {errors.motivo && (
              <p className="text-red-500 text-xs font-bold">
                {errors.motivo.message}
              </p>
            )}
          </div>
        </div>

        {/* Bloco 3: Passageiros */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Users size={14} /> Agentes em Viagem
          </h3>

          <div className="space-y-2">
            <p className="text-sm text-slate-500 mb-4">
              Selecione quem irá viajar. Apenas agentes do seu departamento
              estão listados.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto p-2 border border-slate-100 rounded-xl bg-slate-50">
              {agentes.length === 0 ? (
                <p className="text-sm text-slate-400 p-4">
                  Nenhum agente cadastrado no seu curso.
                </p>
              ) : (
                agentes.map((agente) => (
                  <label
                    key={agente.id}
                    className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                    <input
                      type="checkbox"
                      value={agente.id}
                      {...register("agentIds")}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm font-bold text-slate-700">
                      {agente.firstName} {agente.lastName}
                    </span>
                  </label>
                ))
              )}
            </div>
            {errors.agentIds && (
              <p className="text-red-500 text-xs font-bold mt-2">
                {errors.agentIds.message}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-blue-600 transition-all flex justify-center items-center gap-2 uppercase tracking-widest text-xs">
          {loading ? (
            "Enviando para Análise..."
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
