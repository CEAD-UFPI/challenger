import React, { useEffect, useState } from "react";
import {
  Banknote,
  BarChart3,
  Briefcase,
  Building2,
  ChevronDown,
  ChevronRight,
  FileCheck,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LogOut,
  MapPin,
  Plane,
  ShieldCheck,
  Target,
  User,
  UserCog,
  Users,
} from "lucide-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

function isActiveProjetosItem(path: string, pathname: string) {
  if (pathname === path) return true;
  if (
    path === "/app/cadastros/projetos" &&
    /^\/app\/cadastros\/projetos\/\d+$/.test(pathname)
  )
    return true;
  return false;
}

const projetosSubItems: {
  label: string;
  path: string;
  icon: typeof Briefcase;
  allowed: string[];
}[] = [
  {
    label: "Projetos",
    path: "/app/cadastros/projetos",
    icon: Briefcase,
    allowed: ["ADMIN", "FINANCEIRO", "SOLICITANTE"],
  },
  {
    label: "Naturezas de despesa",
    path: "/app/cadastros/naturezas-despesa",
    icon: Layers,
    allowed: ["ADMIN", "FINANCEIRO"],
  },
  {
    label: "Relatório de gastos",
    path: "/app/cadastros/relatorio-gastos-projeto",
    icon: BarChart3,
    allowed: ["ADMIN", "FINANCEIRO"],
  },
];

export default function Layout() {
  const { user, activeRole, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [projetosOpen, setProjetosOpen] = useState(true);

  useEffect(() => {
    const p = location.pathname;
    if (
      p.startsWith("/app/cadastros/projetos") ||
      p === "/app/cadastros/naturezas-despesa" ||
      p === "/app/cadastros/relatorio-gastos-projeto"
    ) {
      setProjetosOpen(true);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // --- ATUALIZAÇÃO DA LÓGICA DE PERMISSÃO ---
  const hasPermission = (allowedRoles: string[]) => {
    if (allowedRoles.includes("ALL")) return true;

    // Se a role ativa estiver na lista permitida, OK
    if (allowedRoles.includes(activeRole)) return true;

    // REGRA DE OURO: Se o usuário é Solicitante, ele ganha acesso a itens marcados como 'SOLICITANTE'
    // mesmo que a role ativa dele seja apenas 'AGENTE'
    if (user?.isSolicitant && allowedRoles.includes("SOLICITANTE")) return true;

    return false;
  };

  const menuGroups = [
    {
      title: "Cadastros",
      // Adicionamos 'SOLICITANTE' aqui para liberar o grupo para eles
      allowedRoles: ["ADMIN", "FINANCEIRO", "SOLICITANTE"],
      items: [
        {
          label: "Agentes",
          path: "/app/cadastros/agentes",
          icon: Users,
          // Agora Agentes podem ser vistos por solicitantes (mas filtrado no back)
          allowed: ["ADMIN", "FINANCEIRO", "SOLICITANTE"],
        },
        // Itens que só Admin/Financeiro veem (Solicitante NÃO VÊ)
        {
          label: "Bancos",
          path: "/app/cadastros/bancos",
          icon: Building2,
          allowed: ["ADMIN", "FINANCEIRO"],
        },
        {
          label: "Cursos",
          path: "/app/cadastros/cursos",
          icon: GraduationCap,
          allowed: ["ADMIN", "FINANCEIRO"],
        },
        {
          label: "Destinos",
          path: "/app/cadastros/destinos",
          icon: MapPin,
          allowed: ["ADMIN", "FINANCEIRO"],
        },
        {
          label: "Objetivos",
          path: "/app/cadastros/objetivos",
          icon: Target,
          allowed: ["ADMIN", "FINANCEIRO"],
        },
        {
          label: "Solicitantes",
          path: "/app/cadastros/solicitantes",
          icon: UserCog,
          allowed: ["ADMIN"],
        }, // Só admin cria solicitantes
        {
          label: "Tipos de Diária",
          path: "/app/cadastros/tipos-diaria",
          icon: Banknote,
          allowed: ["ADMIN", "FINANCEIRO"],
        },
      ],
    },
    {
      title: "Movimentações",
      allowedRoles: ["ALL"],
      items: [
        {
          label: "Solicitações",
          path: "/app/solicitacoes",
          icon: Plane,
          allowed: [
            "ADMIN",
            "DIRECAO",
            "SOLICITANTE", // Importante estar aqui
            "FINANCEIRO",
            "COORDENACAO",
          ],
        },
        {
          label: "Relatórios de Viagem",
          path: "/app/relatorios",
          icon: FileCheck,
          allowed: ["ALL"],
        },
      ],
    },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl overflow-y-auto">
        <div className="p-6 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <ShieldCheck className="text-white" size={20} />
            </div>
            <h1 className="text-lg font-black tracking-tighter">SDP GOV</h1>
          </div>
          <Link
            to="/app"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-sm font-bold">
            <LayoutDashboard size={18} /> Dashboard
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-6 pb-6">
          {hasPermission(["ADMIN", "FINANCEIRO", "SOLICITANTE"]) && (
            <div>
              <p className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Projetos
              </p>
              <button
                type="button"
                onClick={() => setProjetosOpen(!projetosOpen)}
                className="flex w-full items-center justify-between gap-2 px-4 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white text-sm font-bold">
                <span className="flex items-center gap-3">
                  <Briefcase size={16} />
                  Menu Projetos
                </span>
                {projetosOpen ? (
                  <ChevronDown size={18} />
                ) : (
                  <ChevronRight size={18} />
                )}
              </button>
              {projetosOpen && (
                <div className="mt-1 ml-2 space-y-0.5 border-l-2 border-slate-700 pl-3">
                  {projetosSubItems.map((item, itemIdx) => {
                    if (!hasPermission(item.allowed)) return null;
                    const active = isActiveProjetosItem(
                      item.path,
                      location.pathname,
                    );
                    return (
                      <Link
                        key={itemIdx}
                        to={item.path}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium text-sm ${
                          active
                            ? "bg-blue-600 text-white shadow-md"
                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                        }`}>
                        <item.icon size={16} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {menuGroups.map((group, groupIdx) => {
            if (!hasPermission(group.allowedRoles)) return null;

            return (
              <div key={groupIdx}>
                <p className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {group.items.map((item: any, itemIdx) => {
                    // Checa permissão item a item
                    if (item.allowed && !hasPermission(item.allowed))
                      return null;

                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={itemIdx}
                        to={item.path}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${
                          isActive
                            ? "bg-blue-600 text-white shadow-md"
                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                        }`}>
                        <item.icon size={16} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-6 bg-slate-950 mt-auto border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <User size={16} />
            </div>
            <div className="overflow-hidden w-full">
              <p className="text-sm font-bold truncate">
                {user?.name || user?.username}
              </p>
              {/* Exibe o cargo OU 'Solicitante' */}
              <p className="text-[10px] text-blue-400 font-black uppercase">
                {user?.isSolicitant ? "SOLICITANTE" : activeRole}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-400 hover:text-red-400 font-bold text-xs transition-colors w-full">
            <LogOut size={16} /> Sair do Sistema
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-slate-50">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
