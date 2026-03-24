import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import api from "../../services/api";
import {
  UserCircle,
  MapPin,
  Building,
  ShieldCheck,
  Save,
  Loader2,
  Search,
} from "lucide-react";

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false); // Efeito de carregamento para o CEP
  const [banks, setBanks] = useState<any[]>([]);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [nomeCompleto, setNomeCompleto] = useState("");

  const { register, handleSubmit, reset, setValue } = useForm();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [profileRes, banksRes] = await Promise.all([
          api.get("/me"),
          api.get("/bancos"),
        ]);

        setBanks(banksRes.data);
        const userData = profileRes.data;

        setNomeCompleto(`${userData.firstName} ${userData.lastName}`);

        reset({
          ...userData,
          bancoId: userData.bankId,
        });
      } catch (error) {
        console.error("Erro ao carregar perfil", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [reset]);

  // --- MÁSCARA DE TELEFONE ---
  const handlePhoneMask = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    value = value.replace(/^(\d{2})(\d)/g, "($1) $2");
    value = value.replace(/(\d)(\d{4})$/, "$1-$2");
    e.target.value = value;
    setValue("telefone", value);
  };

  // --- MÁSCARA DE CEP + INTEGRAÇÃO VIACEP ---
  const checkCEP = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let cep = e.target.value.replace(/\D/g, ""); // Extrai só os números

    // Aplica a máscara visual (00000-000)
    e.target.value = cep.replace(/^(\d{5})(\d)/, "$1-$2");
    setValue("cep", e.target.value);

    // Quando bater 8 números, dispara a busca!
    if (cep.length === 8) {
      setSearchingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();

        if (!data.erro) {
          // Injeta os dados nos campos automaticamente
          setValue("endereco", data.logradouro);
          setValue("bairro", data.bairro);
          setValue("cidade", data.localidade);
          setValue("estado", data.uf); // O 'uf' do ViaCEP bate perfeitamente com o seu Enum de 'State'!
        } else {
          alert("CEP não encontrado.");
        }
      } catch (error) {
        console.error("Erro ao buscar o CEP", error);
      } finally {
        setSearchingCep(false);
      }
    }
  };

  const onSubmit = async (data: any) => {
    setSaving(true);
    setMessage(null);
    try {
      await api.put("/me", data);
      setMessage({ type: "success", text: "Perfil atualizado com sucesso!" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({
        type: "error",
        text: "Erro ao atualizar. Verifique os dados.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64 text-slate-400">
        <Loader2 className="animate-spin mr-2" /> Carregando perfil...
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-lg">
          <UserCircle size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Meu Perfil</h1>
          <p className="text-sm text-slate-500">
            Gerencie seus dados pessoais e operacionais
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl font-bold text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* BLOCO 1: DADOS SENSÍVEIS */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-amber-100 text-amber-700 text-[10px] font-black uppercase px-4 py-1 rounded-bl-xl flex items-center gap-1">
            <ShieldCheck size={12} /> Somente Leitura
          </div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
            Dados Institucionais
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Nome Civil Completo
              </label>
              <input
                disabled
                className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 font-bold cursor-not-allowed"
                value={loading ? "" : nomeCompleto}
              />
            </div>

            <div className="lg:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Nome Social
              </label>
              <input
                disabled
                className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 font-bold cursor-not-allowed"
                {...register("nomeSocial")}
                placeholder="Não informado"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                CPF
              </label>
              <input
                disabled
                className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 font-bold cursor-not-allowed"
                {...register("cpf")}
              />
            </div>

            <div className="lg:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Vínculo Institucional
              </label>
              <input
                disabled
                className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 font-bold cursor-not-allowed uppercase"
                {...register("course.nome")}
                placeholder="Sem Vínculo"
              />
            </div>
          </div>
        </div>

        {/* BLOCO 2: CONTATO E ENDEREÇO */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <MapPin size={14} /> Contato & Localização
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                Celular / WhatsApp
              </label>
              <input
                {...register("telefone")}
                onChange={handlePhoneMask}
                maxLength={15}
                className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                E-mail (Login)
              </label>
              <input
                disabled
                {...register("email")}
                className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 font-medium cursor-not-allowed"
              />
            </div>
          </div>

          {/* GRID DE ENDEREÇO */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-3 relative">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                CEP
              </label>
              <div className="relative mt-1">
                <input
                  {...register("cep")}
                  onChange={checkCEP}
                  maxLength={9}
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  placeholder="00000-000"
                />
                <div className="absolute right-3 top-3.5 text-slate-400">
                  {searchingCep ? (
                    <Loader2 size={16} className="animate-spin text-blue-500" />
                  ) : (
                    <Search size={16} />
                  )}
                </div>
              </div>
            </div>

            <div className="md:col-span-7">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                Logradouro / Rua
              </label>
              <input
                {...register("endereco")}
                className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Av. Universitária"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                Número
              </label>
              <input
                {...register("numero")}
                className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nº"
              />
            </div>

            <div className="md:col-span-5">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                Bairro
              </label>
              <input
                {...register("bairro")}
                className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-5">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                Cidade
              </label>
              <input
                {...register("cidade")}
                className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                UF
              </label>
              <input
                {...register("estado")}
                maxLength={2}
                className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                placeholder="PI"
              />
            </div>
          </div>
        </div>

        {/* BLOCO 3: DADOS BANCÁRIOS */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Building size={14} /> Dados Bancários
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-3">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                Banco
              </label>
              <select
                {...register("bancoId")}
                className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Selecione...</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                Agência
              </label>
              <input
                {...register("agencia")}
                className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                Conta Corrente (com dígito)
              </label>
              <input
                {...register("conta")}
                className="w-full mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50">
            {saving ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Save size={20} />
            )}
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}
