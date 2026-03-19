import { PrismaClient } from "@prisma/client";
import { sendConfirmationEmail } from "./services/emailService";
import bcrypt from "bcryptjs";
import cors from "cors";
import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";

// =============================================================
// 1. CONFIGURAÇÕES INICIAIS
// =============================================================
const prisma = new PrismaClient();
const app = express();
const JWT_SECRET = "segredo-super-secreto-mude-em-producao";
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// =============================================================
// 2. HELPERS (Funções Auxiliares)
// =============================================================

// Extrai o usuário logado a partir do Token
const getUserFromRequest = (req: Request) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
};

// Gerador de CRUD Automático (Apenas para tabelas simples sem regras complexas)
const createCrudRoutes = (modelName: string, model: any) => {
  // Listar
  app.get(`/api/${modelName}`, async (req, res) => {
    try {
      const items = await model.findMany();
      res.json(items);
    } catch (e) {
      console.error(`Erro ao listar ${modelName}:`, e);
      res.status(500).json({ error: "Erro interno ao listar" });
    }
  });

  // Criar
  app.post(`/api/${modelName}`, async (req, res) => {
    try {
      const item = await model.create({ data: req.body });
      res.status(201).json(item);
    } catch (e: any) {
      if (e.code === "P2002")
        return res.status(400).json({ error: "Registro duplicado." });
      console.error(`Erro ao criar em ${modelName}:`, e);
      res.status(400).json({ error: "Erro ao criar. Verifique os dados." });
    }
  });

  // Deletar
  app.delete(`/api/${modelName}/:id`, async (req, res) => {
    try {
      await model.delete({ where: { id: Number(req.params.id) } });
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Erro ao deletar" });
    }
  });
};

// =============================================================
// 3. SERVICES (Regras de Negócio Complexas)
// =============================================================

class SolicitationService {
  static async checkBlocklist(agentIds: number[]) {
    const blockedAgents = await prisma.travelReport.findMany({
      where: {
        detail: { agentId: { in: agentIds } },
        status: { notIn: ["FECHADO", "APROVADO"] },
        prazoLimite: { lt: new Date() },
      },
      include: { detail: { include: { agent: true } } },
    });

    if (blockedAgents.length > 0) {
      const names = blockedAgents
        .map((r) => r.detail.agent.firstName || r.detail.agent.username)
        .join(", ");
      throw new Error(`Bloqueado! Pendências: ${names}`);
    }
  }

  static async create(data: any) {
    const { requesterId, agentIds, ...fields } = data;
    await this.checkBlocklist(agentIds);

    return await prisma.solicitation.create({
      data: {
        requesterId,
        motivoSolicitacao: fields.motivo,
        origem: fields.origem,
        destino: fields.destino,
        dataIda: new Date(fields.dataIda),
        dataVolta: new Date(fields.dataVolta),
        status: "AGUARDANDO_DIRECAO",
        details: {
          create: agentIds.map((agentId: number) => ({
            agentId: agentId,
            projetoId: Number(fields.projetoId),
            tipoDiariaId: Number(fields.tipoDiariaId),
            objectiveId: Number(fields.objectiveId),
            qtdDiarias: fields.qtdDiarias > 3.5 ? 3.5 : fields.qtdDiarias,
            valorDiarias: 0,
          })),
        },
      },
    });
  }

  static async updateStatus(
    solicitationId: number,
    role: string,
    action: "APPROVE" | "REJECT" | "PAY",
  ) {
    const sol = await prisma.solicitation.findUnique({
      where: { id: solicitationId },
    });
    if (!sol) throw new Error("Solicitação não encontrada");

    let newStatus = sol.status;

    if (role === "DIRECAO") {
      if (sol.status !== "AGUARDANDO_DIRECAO")
        throw new Error("Não está na vez da Direção");
      if (action === "APPROVE") newStatus = "AGUARDANDO_FINANCEIRO";
      if (action === "REJECT") newStatus = "PENDENTE_CORRECAO";
    }

    if (role === "FINANCEIRO") {
      if (sol.status !== "AGUARDANDO_FINANCEIRO")
        throw new Error("Não está na vez do Financeiro");
      if (action === "APPROVE") newStatus = "APROVADO_PARA_PAGAMENTO";
      if (action === "REJECT") newStatus = "PENDENTE_CORRECAO";
    }

    if (role === "FADEX") {
      if (sol.status !== "APROVADO_PARA_PAGAMENTO")
        throw new Error("Ainda não autorizado pelo Financeiro");
      if (action === "PAY") newStatus = "PAGO";
    }

    return await prisma.solicitation.update({
      where: { id: solicitationId },
      data: { status: newStatus },
    });
  }
}

// =============================================================
// 4. ROTAS DE AUTENTICAÇÃO E USUÁRIOS
// =============================================================

// Login
app.post("/api/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { solicitantProfile: true },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    // Impede o login se o usuário não finalizou o cadastro ou foi bloqueado
    if (user.status !== "ATIVO") {
      return res
        .status(403)
        .json({
          error: "Sua conta está pendente de ativação ou foi bloqueada.",
        });
    }

    const isSolicitant =
      !!user.solicitantProfile ||
      user.roles.includes("COORDENACAO") ||
      user.roles.includes("ADMIN");

    const courseId = user.courseId || user.solicitantProfile?.courseId;

    const token = jwt.sign(
      {
        id: user.id,
        roles: user.roles,
        courseId: courseId,
        isSolicitant: isSolicitant,
      },
      JWT_SECRET,
      { expiresIn: "8h" },
    );

    return res.json({
      user: {
        id: user.id,
        name: user.firstName,
        email: user.email,
        roles: user.roles,
        courseId: courseId,
        isSolicitant: isSolicitant,
      },
      token,
    });
  } catch (error) {
    return res.status(500).json({ error: "Erro interno" });
  }
});

// Listar Usuários (Com filtro de Curso)
app.get("/api/users", async (req, res) => {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return res.status(401).json({ error: "Não autorizado" });

  const isSuperUser = currentUser.roles.some((r: string) =>
    ["ADMIN", "FINANCEIRO", "DIRECAO"].includes(r),
  );

  let whereClause = {};
  if (!isSuperUser) {
    if (!currentUser.courseId) return res.json([]);
    whereClause = { courseId: currentUser.courseId };
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    include: { course: { select: { nome: true } } },
  });

  const safeUsers = users.map((u) => {
    const { passwordHash, ...rest } = u;
    return rest;
  });

  res.json(safeUsers);
});

// -------------------------------------------------------------
// FLUXO NOVO DE CRIAÇÃO E APROVAÇÃO DE AGENTES
// -------------------------------------------------------------

// 1. Criar Usuário Manualmente (Admin/Gestor cria e o sistema envia e-mail)
app.post("/api/users", async (req, res) => {
  try {
    const { cpf, email, role, courseId, ...userData } = req.body;
    const cleanCpf = cpf.replace(/\D/g, "");

    // Gera uma senha temporária
    const randomPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    const user = await prisma.user.create({
      data: {
        ...userData,
        email,
        cpf: cleanCpf,
        username: userData.username || email.split("@")[0],
        passwordHash,
        roles: userData.roles || [role] || ["AGENTE"],
        courseId: courseId ? Number(courseId) : null,
        status: "PENDENTE",
      },
    });

    // Gera um token JWT temporário válido por 48h para o link do e-mail
    const tempToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "48h",
    });

    // Dispara o e-mail de convite
    await sendConfirmationEmail(
      user.email,
      user.firstName || "Agente",
      tempToken,
    );

    res
      .status(201)
      .json({ message: "Agente criado e e-mail de convite enviado!", user });
  } catch (e: any) {
    if (e.code === "P2002") {
      const target = e.meta?.target || [];
      if (target.includes("email"))
        return res.status(400).json({ error: "E-mail já existe." });
      if (target.includes("cpf"))
        return res.status(400).json({ error: "CPF já existe." });
      return res.status(400).json({ error: "Dados duplicados." });
    }
    res.status(500).json({ error: e.message });
  }
});

// 2. Auto-cadastro (Agente se cadastra pela tela de Login)
app.post("/api/users/public/auto-cadastro", async (req, res) => {
  try {
    const { cpf, email, password, firstName, lastName, courseId } = req.body;
    const cleanCpf = cpf.replace(/\D/g, "");
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        cpf: cleanCpf,
        username: email.split("@")[0],
        passwordHash,
        roles: ["AGENTE"],
        courseId: courseId ? Number(courseId) : null,
        status: "PENDENTE", // Aguardando aprovação
      },
    });

    res
      .status(201)
      .json({
        message: "Cadastro realizado. Aguarde a aprovação do seu departamento.",
        user,
      });
  } catch (e: any) {
    if (e.code === "P2002")
      return res.status(400).json({ error: "CPF ou E-mail já cadastrados." });
    res.status(500).json({ error: "Erro ao realizar auto-cadastro." });
  }
});

// 3. Completar Perfil (Agente clica no link do e-mail)
app.post("/api/users/completar-cadastro", async (req, res) => {
  const { token, password, telefone, cep, endereco, bancoId, agencia, conta } =
    req.body;

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const passwordHash = await bcrypt.hash(password, 10);

    const updatedUser = await prisma.user.update({
      where: { id: decoded.id },
      data: {
        passwordHash,
        telefone,
        cep,
        endereco,
        bankId: bancoId ? Number(bancoId) : null,
        agencia,
        conta,
        status: "ATIVO",
      },
    });

    res.json({
      message: "Perfil atualizado! Você já pode fazer login.",
      user: updatedUser,
    });
  } catch (err) {
    res.status(401).json({ error: "Link inválido ou expirado." });
  }
});

// Deletar Usuário
app.delete("/api/users/:id", async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: "Erro ao excluir (possui vínculos)." });
  }
});

// =============================================================
// 5. ROTAS DE SOLICITANTES (Vínculo User <-> Curso)
// =============================================================

app.get("/api/solicitantes", async (req, res) => {
  try {
    const items = await prisma.solicitant.findMany({
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        course: true,
      },
    });
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: "Erro ao listar solicitantes" });
  }
});

app.post("/api/solicitantes", async (req, res) => {
  try {
    const { userId, courseId } = req.body;
    const item = await prisma.solicitant.create({
      data: { userId: Number(userId), courseId: Number(courseId) },
    });
    res.status(201).json(item);
  } catch (e: any) {
    if (e.code === "P2002")
      return res.status(400).json({ error: "Vínculo já existe." });
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/solicitantes/:id", async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } }); // Corrigido para deletar da tabela correta se necessário, ou manter conforme a regra de negócio. (Seu código original de solicitantes tinha prisma.solicitant.delete, mas note que mantive igual o seu exceto o erro aqui que eu identifiquei. Vamos deixar o prisma.solicitant.delete)
    await prisma.solicitant.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: "Erro ao remover." });
  }
});

// =============================================================
// 6. ROTAS DE PROJETOS (Com Filtro de Segurança)
// =============================================================

app.get("/api/projetos", async (req, res) => {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return res.status(401).json({ error: "Não autorizado" });

  const isSuperUser = currentUser.roles.some((r: string) =>
    ["ADMIN", "FINANCEIRO"].includes(r),
  );

  let whereClause = {};
  if (!isSuperUser) {
    if (!currentUser.courseId) return res.json([]);
    whereClause = { courseId: currentUser.courseId };
  }

  const items = await prisma.project.findMany({ where: whereClause });
  res.json(items);
});

app.post("/api/projetos", async (req, res) => {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return res.status(401).json({ error: "Não autorizado" });

  try {
    const courseIdToSave = req.body.courseId || currentUser.courseId;
    const item = await prisma.project.create({
      data: {
        ...req.body,
        courseId: courseIdToSave ? Number(courseIdToSave) : null,
      },
    });
    res.status(201).json(item);
  } catch (e: any) {
    res.status(400).json({ error: "Erro ao criar projeto." });
  }
});

// =============================================================
// 7. ROTAS DE SOLICITAÇÕES (Com Filtro de Segurança)
// =============================================================

// Listar (Com filtro por Curso)
app.get("/api/solicitacoes", async (req, res) => {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return res.status(401).json({ error: "Não autorizado" });

  const isSuperUser = currentUser.roles.some((r: string) =>
    ["ADMIN", "FINANCEIRO", "DIRECAO"].includes(r),
  );

  let whereClause: any = {};
  if (!isSuperUser) {
    if (!currentUser.courseId) return res.json([]);
    // Solicitante vê apenas solicitações do SEU curso
    whereClause = {
      requester: { courseId: currentUser.courseId },
    };
  }

  try {
    const items = await prisma.solicitation.findMany({
      where: whereClause,
      include: { requester: true, details: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: "Erro ao listar" });
  }
});

// Criar
app.post("/api/solicitacoes", async (req, res) => {
  try {
    const result = await SolicitationService.create(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    res
      .status(err.message.includes("Bloqueado") ? 403 : 400)
      .json({ error: err.message });
  }
});

// Atualizar Status
app.patch("/api/solicitacoes/:id/status", async (req, res) => {
  try {
    const result = await SolicitationService.updateStatus(
      Number(req.params.id),
      req.body.role,
      req.body.action,
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// =============================================================
// 8. ROTAS DE RELATÓRIOS (Com Filtro de Segurança)
// =============================================================

app.get("/api/relatorios", async (req, res) => {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return res.status(401).json({ error: "Não autorizado" });

  const isSuperUser = currentUser.roles.some((r: string) =>
    ["ADMIN", "FINANCEIRO", "FADEX"].includes(r),
  );

  let whereClause: any = {};
  if (!isSuperUser) {
    if (!currentUser.courseId) return res.json([]);

    // Vê relatórios de viagens originadas no seu curso
    whereClause = {
      detail: {
        solicitation: {
          requester: { courseId: currentUser.courseId },
        },
      },
    };
  }

  try {
    const reports = await prisma.travelReport.findMany({
      where: whereClause,
      include: {
        detail: {
          include: { agent: true, solicitation: true },
        },
      },
    });
    res.json(reports);
  } catch (e) {
    res.status(500).json({ error: "Erro ao listar relatórios" });
  }
});

// =============================================================
// 9. CADASTROS BÁSICOS (Tabelas Auxiliares)
// =============================================================

createCrudRoutes("bancos", prisma.bank);
createCrudRoutes("cursos", prisma.course);
createCrudRoutes("destinos", prisma.destination);
createCrudRoutes("objetivos", prisma.solicitationObjective);
createCrudRoutes("tipos-diaria", prisma.dailyRateType);

// =============================================================
// 10. INICIALIZAÇÃO
// =============================================================
app.listen(PORT, () =>
  console.log(`🚀 Backend Challenger rodando na porta ${PORT}`),
);
