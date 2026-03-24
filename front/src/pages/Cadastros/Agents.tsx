import { AlertTriangle, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import api from "../../services/api";

export default function Agents() {
  const [agents, setAgents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);

  // Controle de edição
  const [editingId, setEditingId] = useState<number | null>(null);

  const { register, handleSubmit, reset, setValue } = useForm();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [cpfError, setCpfError] = useState("");

  const loadData = async () => {
    try {
      const [userData, bankData, courseData] = await Promise.all([
        api.get("/users"),
        api.get("/bancos"),
        api.get("/cursos"),
      ]);
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

  const handleCpfMask = (event: React.ChangeEvent<HTMLInputElement>) => {
    let value = event.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 9)
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
    else if (value.length > 6)
      value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
    else if (value.length > 3)
      value = value.replace(/(\d{3})(\d{1,3})/, "$1.$2");

    event.target.value = value;
    setValue("cpf", value);
    setCpfError("");
  };

  const handleCpfBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value && !validateCPF(value))
      setCpfError("CPF Inválido. Verifique os números.");
  };

  // --- NOVA FUNÇÃO PARA ENTRAR EM MODO EDIÇÃO ---
  const handleEdit = (user: any) => {
    setEditingId(user.id);
    setValue("firstName", user.firstName);
    setValue("lastName", user.lastName);
    setValue("nomeSocial", user.nomeSocial || "");

    // Aplica máscara no CPF antes de jogar no input
    let cpfMasked = user.cpf
      ? user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
      : "";
    setValue("cpf", cpfMasked);

    setValue("email", user.email);
    setValue("role", user.roles?.[0] || "AGENTE");
    setValue("courseId", user.courseId || "");
    setValue("bankId", user.bankId || "");
    setValue("agencia", user.agencia || "");
    setValue("conta", user.conta || "");

    // Rola a tela suavemente para cima
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Cancela a edição e limpa tudo
  const cancelEdit = () => {
    setEditingId(null);
    reset();
    setCpfError("");
    setErrorMessage("");
  };

  const onSubmit = async (data: any) => {
    setErrorMessage("");
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
        courseId: data.courseId ? Number(data.courseId) : null,
      };

      if (editingId) {
        // Se tem ID, atualiza
        await api.put(`/users/${editingId}`, payload);
      } else {
        // Se não tem ID, cria um novo
        await api.post("/users", payload);
      }

      cancelEdit(); // Limpa a tela
      loadData(); // Recarrega a tabela
    } catch (e: any) {
      if (e.response && e.response.data && e.response.data.error) {
        setErrorMessage(e.response.data.error);
      } else {
        setErrorMessage("Erro desconhecido ao salvar agente.");
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
        className={`p-8 rounded-[2rem] shadow-sm border relative transition-colors ${editingId ? "bg-purple-50 border-purple-200" : "bg-white border-slate-200"}`}>
        <div className="flex justify-between items-center mb-6">
          <h3
            className={`text-sm font-black uppercase tracking-widest ${editingId ? "text-purple-600" : "text-slate-400"}`}>
            {editingId ? "Editando Servidor" : "Novo Servidor"}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="text-xs font-bold text-slate-500 hover:text-red-500 flex items-center gap-1">
              <X size={14} /> Cancelar Edição
            </button>
          )}
        </div>

        {errorMessage && (
          <div className="absolute top-6 right-6 bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border border-red-100 animate-pulse">
            <AlertTriangle size={16} /> {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
              Nome Civil
            </label>
            <input
              {...register("firstName")}
              required
              className="w-full mt-1 p-3 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
              Sobrenome
            </label>
            <input
              {...register("lastName")}
              required
              className="w-full mt-1 p-3 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
              Nome Social{" "}
              <span className="text-[9px] text-purple-400">(Opcional)</span>
            </label>
            <input
              {...register("nomeSocial")}
              placeholder="Como prefere ser chamado"
              className="w-full mt-1 p-3 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex justify-between">
              CPF{" "}
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
              className={`w-full mt-1 p-3 bg-white rounded-xl border outline-none transition-all font-medium focus:ring-2 ${cpfError ? "border-red-500 focus:ring-red-500" : "border-slate-200 focus:ring-purple-500"}`}
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
              className="w-full mt-1 p-3 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
          </div>

          {/* SÓ MOSTRA A SENHA INICIAL SE ESTIVER CRIANDO NOVO (Não edita senha por aqui) */}
          {!editingId && (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Senha Inicial
              </label>
              <input
                type="password"
                {...register("password")}
                required
                className="w-full mt-1 p-3 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                placeholder="******"
              />
            </div>
          )}

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
              Função (Role)
            </label>
            <select
              {...register("role")}
              className="w-full mt-1 p-3 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all">
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
              className="w-full mt-1 p-3 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all">
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
              className="w-full mt-1 p-3 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all">
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
                className="w-full mt-1 p-3 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Conta
              </label>
              <input
                {...register("conta")}
                className="w-full mt-1 p-3 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            disabled={loading || !!cpfError}
            className={`font-bold py-3 px-8 rounded-xl transition-all flex items-center gap-2 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${editingId ? "bg-purple-600 text-white hover:bg-purple-700 shadow-purple-200" : "bg-slate-900 text-white hover:bg-purple-600 shadow-purple-100"}`}>
            {loading ? (
              "Salvando..."
            ) : (
              <>
                {editingId ? <Pencil size={18} /> : <Plus size={18} />}
                {editingId ? "Salvar Alterações" : "Cadastrar Agente"}
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
              <th className="p-4">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {agents.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-bold text-slate-700">
                  <div className="font-bold text-slate-700">
                    {/* Exibe o Nome Social se existir, senão o Civil */}
                    {u.nomeSocial
                      ? u.nomeSocial
                      : `${u.firstName} ${u.lastName}`}
                  </div>

                  {/* Se tiver Nome Social, mostra o Civil bem pequenininho como referência */}
                  {u.nomeSocial && (
                    <div className="text-[10px] font-medium text-slate-400 uppercase mt-1">
                      Registro Civil: {u.firstName} {u.lastName}
                    </div>
                  )}
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(u)}
                      className="text-blue-400 hover:text-blue-600 transition-colors p-2 hover:bg-blue-50 rounded-lg">
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-red-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
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
