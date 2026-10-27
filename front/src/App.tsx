import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "./store/authStore";

import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import MyReports from "./pages/MyReports";
import ResetPassword from "./pages/ResetPassword";

// --- IMPORTANTE: Importe as duas telas de solicitações ---
import NewSolicitation from "./pages/Movimentacoes/NewSolicitation"; // A tela do formulário (ajuste o caminho se necessário)
import Solicitations from "./pages/Movimentacoes/Solicitations"; // A tela da tabela/aprovação

import GenericCadastro from "./components/GenericCadastro";
import Agents from "./pages/Cadastros/Agents";
import CompleteProfile from "./pages/Cadastros/CompleteProfile";
import DailyValues from "./pages/Cadastros/DailyValues";
import Projects from "./pages/Cadastros/Projects";
import Solicitants from "./pages/Cadastros/Solicitants";
import Profile from "./pages/Cadastros/Profile";

import { Building2, GraduationCap, MapPin, Target } from "lucide-react";

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
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/completar-registo" element={<CompleteProfile />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
          <Route index element={<Dashboard />} />
          <Route path="perfil" element={<Profile />} />

          {/* --- AS DUAS ROTAS DE SOLICITAÇÃO AQUI 👇 --- */}
          <Route path="solicitacoes" element={<Solicitations />} />
          <Route path="solicitacoes/nova" element={<NewSolicitation />} />
          <Route path="solicitacoes/:id/editar" element={<NewSolicitation />} />

          <Route path="relatorios" element={<MyReports />} />

          <Route path="cadastros/agentes" element={<Agents />} />
          <Route path="cadastros/projetos" element={<Projects />} />
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
