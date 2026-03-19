import { AlertTriangle, Plus, Trash2, Users } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import api from "../../services/api";

export default function Agents() {
  const [agents, setAgents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const { register, handleSubmit, reset, setValue } = useForm();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [cpfError, setCpfError] = useState(""); // Novo estado só para o CPF no onBlur

  const loadData = async () => {
    try {
      const [userData, bankData, courseData] = await Promise.all([
        api.get("/users"),
        api.get("/bancos"),
        api.get("/cursos"),
      ]);

      // 👇 NOSSOS RASTREADORES
      console.log("Bancos retornados da API:", bankData.data);
      console.log("Cursos retornados da API:", courseData.data);
      
      setCourses(courseData.data);
      setAgents(userData.data.filter((u: any) => !u.roles.includes("ADMIN")));
      setBanks(bankData.data);
    } catch (err) {
      console.error("Erro ao carregar dados", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- 1. ALGORITMO DE VALIDAÇÃO (Receita Federal) ---
  const validateCPF = (cpf: string) => {
    cpf = cpf.replace(/[^\d]+/g, "");
    if (cpf === "") return false;
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    let add = 0;
    for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
    let rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(9))) return false;

    add = 0;
    for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(10))) return false;

    return true;
  };

  // --- 2. MÁSCARA VISUAL NO CHANGE ---
  const handleCpfMask = (event: React.ChangeEvent<HTMLInputElement>) => {
    let value = event.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 9) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
    } else if (value.length > 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
    } else if (value.length > 3) {
      value = value.replace(/(\d{3})(\d{1,3})/, "$1.$2");
    }

    event.target.value = value;
    setValue("cpf", value);
    setCpfError(""); // Limpa o erro ao digitar
  };

  // --- 3. VALIDAÇÃO AO SAIR DO CAMPO (onBlur) ---
  const handleCpfBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value && !validateCPF(value)) {
      setCpfError("CPF Inválido. Verifique os números.");
    }
  };

  const onSubmit = async (data: any) => {
    setErrorMessage("");

    // Bloqueio de segurança redundante
    if (!validateCPF(data.cpf)) {
      setErrorMessage("CPF Inválido. Verifique os números.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...data,
        roles: [data.role],
        bankId: data.bankId ? Number(data.bankId) : null,
        courseId: data.courseId ? Number(data.courseId) : null, // Envia o curso para o backend
      };
      await api.post("/users", payload);
      reset();
      loadData();
    } catch (e: any) {
      if (e.response && e.response.data && e.response.data.error) {
        setErrorMessage(e.response.data.error);
      } else {
        setErrorMessage("Erro desconhecido ao cadastrar agente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Remover acesso deste usuário?")) {
      try {
        await api.delete(`/users/${id}`);
        loadData();
      } catch (error) {
        alert(
          "Não foi possível excluir. Este usuário pode ter solicitações vinculadas.",
        );
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-purple-600 p-3 rounded-2xl text-white shadow-lg">
          <Users size={28} />
        </div>
        <h1 className="text-2xl font-black text-slate-900">
          Agentes & Usuários
        </h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 relative">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">
          Novo Servidor
        </h3>

        {/* Exibe mensagem genérica de erro (E-mail duplicado, erro de API) */}
        {errorMessage && (
          <div className="absolute top-6 right-6 bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border border-red-100 animate-pulse">
            <AlertTriangle size={16} /> {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
              Nome
            </label>
            <input
              {...register("firstName")}
              required
              className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
              Sobrenome
            </label>
            <input
              {...register("lastName")}
              required
              className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex justify-between">
              CPF
              {cpfError && (
                <span className="text-red-500 normal-case flex items-center gap-1">
                  <AlertTriangle size={10} /> {cpfError}
                </span>
              )}
            </label>
            <input
              {...register("cpf")}
              onChange={handleCpfMask}
              onBlur={handleCpfBlur}
              required
              maxLength={14}
              placeholder="000.000.000-00"
              className={`w-full mt-1 p-3 bg-slate-50 rounded-xl border outline-none transition-all font-medium focus:ring-2 ${cpfError ? "border-red-500 focus:ring-red-500" : "border-slate-200 focus:ring-purple-500"}`}
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
              Email
            </label>
            <input
              type="email"
              {...register("email")}
              required
              className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
              Senha Inicial
            </label>
            <input
              type="password"
              {...register("password")}
              required
              className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              placeholder="******"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
              Função (Role)
            </label>
            <select
              {...register("role")}
              className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all">
              <option value="AGENTE">Agente / Professor</option>
              <option value="COORDENACAO">Coordenação</option>
              <option value="FINANCEIRO">Financeiro</option>
              <option value="DIRECAO">Direção</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
              Curso / Depto
            </label>
            <select
              {...register("courseId")}
              className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all">
              <option value="">Sem vínculo específico...</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
              Banco
            </label>
            <select
              {...register("bankId")}
              className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all">
              <option value="">Selecione o Banco...</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Agência
              </label>
              <input
                {...register("agencia")}
                className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Conta
              </label>
              <input
                {...register("conta")}
                className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            disabled={loading || !!cpfError}
            className="bg-slate-900 text-white font-bold py-3 px-8 rounded-xl hover:bg-purple-600 transition-all flex items-center gap-2 shadow-xl shadow-purple-100 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? (
              "Salvando..."
            ) : (
              <>
                <Plus size={18} /> Cadastrar Agente
              </>
            )}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase font-black text-xs">
            <tr>
              <th className="p-4">Nome</th>
              <th className="p-4">CPF</th>
              <th className="p-4">Email / Vínculo</th>
              <th className="p-4">Perfil</th>
              <th className="p-4">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {agents.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-bold text-slate-700">
                  {u.firstName} {u.lastName}
                </td>
                <td className="p-4 text-slate-500 font-mono text-xs">
                  {u.cpf
                    ? u.cpf.replace(
                        /(\d{3})(\d{3})(\d{3})(\d{2})/,
                        "$1.$2.$3-$4",
                      )
                    : "-"}
                </td>
                <td className="p-4">
                  <div className="text-slate-500">{u.email}</div>
                  {u.course && (
                    <div className="text-[10px] text-purple-600 font-bold uppercase mt-1">
                      {u.course.nome}
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider">
                    {u.roles?.[0]}
                  </span>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="text-red-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {agents.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  Nenhum agente encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
