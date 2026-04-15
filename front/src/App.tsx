import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "./store/authStore";

import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

// --- IMPORTANTE: Importe as duas telas de solicitações ---
import NewSolicitation from "./pages/Movimentacoes/NewSolicitation";
import Solicitations from "./pages/Movimentacoes/Solicitations";

import GenericCadastro from "./components/GenericCadastro";
import Agents from "./pages/Cadastros/Agents";
import CompleteProfile from "./pages/Cadastros/CompleteProfile";
import DailyValues from "./pages/Cadastros/DailyValues";
import Projects from "./pages/Cadastros/Projects";
import ProjectFinancialEdit from "./pages/Cadastros/ProjectFinancialEdit";
import NaturezasDespesa from "./pages/Cadastros/NaturezasDespesa";
import RelatorioGastosProjeto from "./pages/Cadastros/RelatorioGastosProjeto";
import Solicitants from "./pages/Cadastros/Solicitants";

import { Building2, GraduationCap, MapPin, Target } from "lucide-react";

const ComingSoon = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-96 text-slate-400">
    <h1 className="text-4xl font-black text-slate-200 mb-4">Em Construção</h1>
    <p className="text-lg font-medium text-slate-600">Módulo: {title}</p>
  </div>
);

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/completar-registo" element={<CompleteProfile />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
          <Route index element={<Dashboard />} />

          {/* --- AS DUAS ROTAS DE SOLICITAÇÃO AQUI 👇 --- */}
          <Route path="solicitacoes" element={<Solicitations />} />
          <Route path="solicitacoes/nova" element={<NewSolicitation />} />

          <Route
            path="relatorios"
            element={<ComingSoon title="Relatórios" />}
          />

          <Route path="cadastros/agentes" element={<Agents />} />
          {/* Rota dinâmica antes da estática: evita conflito de matching em alguns casos */}
          <Route
            path="cadastros/relatorio-gastos-projeto"
            element={<RelatorioGastosProjeto />}
          />
          <Route
            path="cadastros/projetos/:projectId"
            element={<ProjectFinancialEdit />}
          />
          <Route path="cadastros/projetos" element={<Projects />} />
          <Route
            path="cadastros/naturezas-despesa"
            element={<NaturezasDespesa />}
          />
          <Route path="cadastros/tipos-diaria" element={<DailyValues />} />
          <Route path="cadastros/solicitantes" element={<Solicitants />} />

          <Route
            path="cadastros/bancos"
            element={
              <GenericCadastro
                title="Bancos"
                endpoint="bancos"
                fieldName="nome"
                label="Nome do Banco"
                icon={<Building2 size={28} />}
              />
            }
          />
          <Route
            path="cadastros/cursos"
            element={
              <GenericCadastro
                title="Cursos"
                endpoint="cursos"
                fieldName="nome"
                label="Nome do Curso"
                icon={<GraduationCap size={28} />}
              />
            }
          />
          <Route
            path="cadastros/destinos"
            element={
              <GenericCadastro
                title="Destinos"
                endpoint="destinos"
                fieldName="nome"
                label="Cidade/Destino"
                icon={<MapPin size={28} />}
              />
            }
          />
          <Route
            path="cadastros/objetivos"
            element={
              <GenericCadastro
                title="Objetivos"
                endpoint="objetivos"
                fieldName="objetivo"
                label="Descrição"
                icon={<Target size={28} />}
              />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
