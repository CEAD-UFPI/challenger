import { Prisma, PrismaClient } from "@prisma/client";
import { Express, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./jwtConfig";

type JwtUser = {
  id: number;
  roles: string[];
  courseId?: number | null;
};

function getUser(req: Request): JwtUser | null {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as JwtUser;
  } catch {
    return null;
  }
}

function isAdminOrFinanceiro(u: JwtUser) {
  return u.roles.some((r) => ["ADMIN", "FINANCEIRO"].includes(r));
}

function canRemanejar(u: JwtUser, podeRemanejarCredito?: boolean) {
  if (u.roles.includes("ADMIN")) return true;
  if (u.roles.includes("FINANCEIRO") && podeRemanejarCredito) return true;
  return false;
}

function dec(v: Prisma.Decimal | number | string): Prisma.Decimal {
  return v instanceof Prisma.Decimal ? v : new Prisma.Decimal(String(v));
}

function sumLines(lines: { saldoNatureza: Prisma.Decimal }[]): Prisma.Decimal {
  return lines.reduce((a, l) => a.add(dec(l.saldoNatureza)), new Prisma.Decimal(0));
}

/** Total de ações (nível projeto) = soma dos saldos das linhas de natureza em todos os créditos */
async function totalAcoesProjectLevel(
  prisma: PrismaClient,
  projectId: number,
): Promise<Prisma.Decimal> {
  const agg = await prisma.creditBalanceNature.aggregate({
    where: { creditBalance: { projectId } },
    _sum: { saldoNatureza: true },
  });
  return agg._sum.saldoNatureza ?? new Prisma.Decimal(0);
}

/** Soma dos valores dos créditos do projeto */
async function sumCreditosValor(
  prisma: PrismaClient,
  projectId: number,
): Promise<Prisma.Decimal> {
  const agg = await prisma.creditBalance.aggregate({
    where: { projectId },
    _sum: { valor: true },
  });
  return agg._sum.valor ?? new Prisma.Decimal(0);
}

/** Saldo Crédito (nível projeto) = soma créditos − total linhas natureza */
async function saldoCreditoProjectLevel(
  prisma: PrismaClient,
  projectId: number,
): Promise<Prisma.Decimal> {
  const sc = await sumCreditosValor(prisma, projectId);
  const ta = await totalAcoesProjectLevel(prisma, projectId);
  return sc.sub(ta);
}

/** Comprometido por (projeto, natureza) */
async function committedByNature(
  prisma: PrismaClient,
  projectId: number,
  excludeActionId?: number,
): Promise<Map<number, Prisma.Decimal>> {
  const actions = await prisma.executionAction.findMany({
    where: { projectId, ...(excludeActionId ? { id: { not: excludeActionId } } : {}) },
    select: { expenseNatureId: true, valor: true },
  });
  const m = new Map<number, Prisma.Decimal>();
  for (const a of actions) {
    const k = a.expenseNatureId;
    m.set(k, (m.get(k) ?? new Prisma.Decimal(0)).add(dec(a.valor)));
  }
  return m;
}

/** Limite por natureza = soma dos saldos das linhas em todos os créditos do projeto */
async function limiteNatureza(
  prisma: PrismaClient,
  projectId: number,
  expenseNatureId: number,
): Promise<Prisma.Decimal> {
  const agg = await prisma.creditBalanceNature.aggregate({
    where: {
      expenseNatureId,
      creditBalance: { projectId },
    },
    _sum: { saldoNatureza: true },
  });
  return agg._sum.saldoNatureza ?? new Prisma.Decimal(0);
}

/** Soma dos valores de crédito do projeto, opcionalmente excluindo um crédito (edição). */
async function sumCreditosValorExcluding(
  prisma: PrismaClient,
  projectId: number,
  excludeCreditId?: number,
): Promise<Prisma.Decimal> {
  const agg = await prisma.creditBalance.aggregate({
    where: {
      projectId,
      ...(excludeCreditId != null ? { id: { not: excludeCreditId } } : {}),
    },
    _sum: { valor: true },
  });
  return agg._sum.valor ?? new Prisma.Decimal(0);
}

/** Disponível na linha (exibição): saldo da linha − total ações projeto+natureza */
function disponivelLinha(
  saldoLinha: Prisma.Decimal,
  committed: Prisma.Decimal,
): Prisma.Decimal {
  return dec(saldoLinha).sub(dec(committed));
}

async function loadUserPerm(prisma: PrismaClient, userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { podeRemanejarCredito: true },
  });
}

async function assertProjectAccess(
  prisma: PrismaClient,
  user: JwtUser,
  projectId: number,
  write: boolean,
): Promise<{ ok: boolean; status: number; error?: string }> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { ok: false, status: 404, error: "Projeto não encontrado." };
  if (isAdminOrFinanceiro(user)) return { ok: true, status: 200 };
  if (!write && user.courseId && project.courseId === user.courseId) return { ok: true, status: 200 };
  return { ok: false, status: 403, error: "Sem permissão." };
}

export function registerFinancialRoutes(app: Express, prisma: PrismaClient) {
  // --- Natureza de Despesa (catálogo) ---
  app.get("/api/naturezas-despesa", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    const items = await prisma.expenseNature.findMany({ orderBy: { nome: "asc" } });
    res.json(items);
  });

  app.post("/api/naturezas-despesa", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    if (!isAdminOrFinanceiro(user)) return res.status(403).json({ error: "Sem permissão." });
    try {
      const { nome, descricao, codigo, tipo } = req.body;
      const item = await prisma.expenseNature.create({
        data: {
          nome,
          descricao: descricao ?? null,
          codigo: String(codigo).trim(),
          tipo,
        },
      });
      res.status(201).json(item);
    } catch (e: any) {
      if (e.code === "P2002")
        return res.status(400).json({ error: "Já existe uma Natureza de Despesa com este código." });
      res.status(400).json({ error: "Erro ao criar natureza." });
    }
  });

  app.patch("/api/naturezas-despesa/:id", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    if (!isAdminOrFinanceiro(user)) return res.status(403).json({ error: "Sem permissão." });
    try {
      const id = Number(req.params.id);
      const { nome, descricao, codigo, tipo } = req.body;
      const item = await prisma.expenseNature.update({
        where: { id },
        data: {
          ...(nome != null && { nome }),
          ...(descricao !== undefined && { descricao }),
          ...(codigo != null && { codigo: String(codigo).trim() }),
          ...(tipo != null && { tipo }),
        },
      });
      res.json(item);
    } catch (e: any) {
      if (e.code === "P2002")
        return res.status(400).json({ error: "Já existe uma Natureza de Despesa com este código." });
      res.status(400).json({ error: "Erro ao atualizar." });
    }
  });

  app.delete("/api/naturezas-despesa/:id", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    if (!isAdminOrFinanceiro(user)) return res.status(403).json({ error: "Sem permissão." });
    try {
      await prisma.expenseNature.delete({ where: { id: Number(req.params.id) } });
      res.json({ success: true });
    } catch (e: any) {
      if (e.code === "P2003")
        return res.status(400).json({
          error: "Não é possível excluir: natureza em uso em créditos ou ações.",
        });
      res.status(400).json({ error: "Erro ao excluir." });
    }
  });

  // --- Projeto: detalhe + painel financeiro ---
  app.get("/api/projetos/:id", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    const id = Number(req.params.id);
    const access = await assertProjectAccess(prisma, user, id, false);
    if (!access.ok) return res.status(access.status).json({ error: access.error });
    const project = await prisma.project.findUnique({ where: { id } });
    res.json(project);
  });

  app.patch("/api/projetos/:id", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    if (!isAdminOrFinanceiro(user)) return res.status(403).json({ error: "Sem permissão." });
    const id = Number(req.params.id);
    try {
      const { nomeDoProjeto, numTed, dtInicial, dtFinal, contaCorrente, saldo, courseId } =
        req.body;
      const data: Prisma.ProjectUpdateInput = {};
      if (nomeDoProjeto != null) data.nomeDoProjeto = nomeDoProjeto;
      if (numTed != null) data.numTed = numTed;
      if (dtInicial != null) data.dtInicial = new Date(dtInicial);
      if (dtFinal != null) data.dtFinal = new Date(dtFinal);
      if (contaCorrente != null) data.contaCorrente = contaCorrente;
      if (saldo != null) data.saldo = new Prisma.Decimal(saldo);
      if (courseId !== undefined) data.courseId = courseId ? Number(courseId) : null;
      const item = await prisma.project.update({ where: { id }, data });
      res.json(item);
    } catch (e: any) {
      if (e.code === "P2002") return res.status(400).json({ error: "Nº TED já cadastrado." });
      res.status(400).json({ error: "Erro ao atualizar projeto." });
    }
  });

  app.delete("/api/projetos/:id", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    if (!isAdminOrFinanceiro(user)) return res.status(403).json({ error: "Sem permissão." });
    try {
      await prisma.project.delete({ where: { id: Number(req.params.id) } });
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Erro ao excluir projeto." });
    }
  });

  app.get("/api/projetos/:id/financeiro", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    const projectId = Number(req.params.id);
    const access = await assertProjectAccess(prisma, user, projectId, false);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ error: "Projeto não encontrado." });

    const credits = await prisma.creditBalance.findMany({
      where: { projectId },
      orderBy: { dataCredito: "desc" },
      include: {
        lines: { include: { expenseNature: true } },
      },
    });

    const actions = await prisma.executionAction.findMany({
      where: { projectId },
      orderBy: { id: "desc" },
      include: { expenseNature: true },
    });

    const committed = await committedByNature(prisma, projectId);
    const totalAcoes = await totalAcoesProjectLevel(prisma, projectId);
    const saldoCredito = await saldoCreditoProjectLevel(prisma, projectId);

    const creditsOut = credits.map((c) => {
      const linesOut = c.lines.map((ln) => {
        const com = committed.get(ln.expenseNatureId) ?? new Prisma.Decimal(0);
        const disp = disponivelLinha(ln.saldoNatureza, com);
        return {
          ...ln,
          saldoNatureza: ln.saldoNatureza.toString(),
          totalVinculadoAcoes: com.toString(),
          saldoDisponivel: disp.toString(),
        };
      });
      return {
        ...c,
        valor: c.valor.toString(),
        lines: linesOut,
        somaNaturezas: sumLines(c.lines).toString(),
      };
    });

    const permUser = isAdminOrFinanceiro(user)
      ? await loadUserPerm(prisma, user.id)
      : null;

    res.json({
      project: {
        ...project,
        saldo: project.saldo.toString(),
      },
      indicadores: {
        saldoCredito: saldoCredito.toString(),
        totalAcoes: totalAcoes.toString(),
        saldoOrcamentario: project.saldo.toString(),
      },
      creditos: creditsOut,
      acoesExecucao: actions.map((a) => ({
        ...a,
        valor: a.valor.toString(),
      })),
      permissoes: {
        edicaoFinanceira: isAdminOrFinanceiro(user),
        remanejamento:
          isAdminOrFinanceiro(user) &&
          canRemanejar(user, permUser?.podeRemanejarCredito ?? false),
      },
    });
  });

  // --- Crédito Saldo ---
  app.post("/api/projetos/:projectId/creditos-saldo", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    if (!isAdminOrFinanceiro(user)) return res.status(403).json({ error: "Sem permissão." });
    const projectId = Number(req.params.projectId);
    const access = await assertProjectAccess(prisma, user, projectId, true);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const { dataCredito, valor, notaCredito, linhas } = req.body as {
      dataCredito: string;
      valor: string | number;
      notaCredito?: string;
      linhas: { expenseNatureId: number; saldoNatureza: string | number }[];
    };

    const valorDec = dec(valor);
    const natureIds = linhas.map((l) => l.expenseNatureId);
    const uniq = new Set(natureIds);
    if (uniq.size !== natureIds.length) {
      const dup = natureIds.find((id, i) => natureIds.indexOf(id) !== i);
      const nat = await prisma.expenseNature.findUnique({ where: { id: dup! } });
      return res.status(400).json({
        error: `Natureza de Despesa repetida no mesmo Crédito Saldo: "${nat?.nome ?? dup}".`,
      });
    }

    let sumNat = new Prisma.Decimal(0);
    for (const l of linhas) {
      sumNat = sumNat.add(dec(l.saldoNatureza));
    }
    if (sumNat.gt(valorDec)) {
      return res.status(400).json({
        error: `A soma dos Saldos por Natureza (${sumNat.toFixed(2)}) não pode ser maior que o Valor do Crédito (${valorDec.toFixed(2)}).`,
      });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ error: "Projeto não encontrado." });
    const orcamento = dec(project.saldo);
    const somaCreditosAtual = await sumCreditosValor(prisma, projectId);
    const totalApos = somaCreditosAtual.add(valorDec);
    if (totalApos.gt(orcamento)) {
      return res.status(400).json({
        error: `A soma dos valores dos Créditos Saldo do projeto não pode ultrapassar o Saldo Orçamentário (${orcamento.toFixed(2)}). Soma atual dos créditos: ${somaCreditosAtual.toFixed(2)}; este crédito: ${valorDec.toFixed(2)}; total seria: ${totalApos.toFixed(2)}.`,
      });
    }

    try {
      const created = await prisma.$transaction(async (tx) => {
        return tx.creditBalance.create({
          data: {
            projectId,
            dataCredito: new Date(dataCredito),
            valor: valorDec,
            notaCredito: notaCredito ?? null,
            lines: {
              create: linhas.map((l) => ({
                expenseNatureId: l.expenseNatureId,
                saldoNatureza: dec(l.saldoNatureza),
              })),
            },
          },
          include: { lines: { include: { expenseNature: true } } },
        });
      });
      res.status(201).json(created);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Erro ao criar crédito." });
    }
  });

  app.patch("/api/creditos-saldo/:id", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    if (!isAdminOrFinanceiro(user)) return res.status(403).json({ error: "Sem permissão." });
    const id = Number(req.params.id);
    const existing = await prisma.creditBalance.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!existing) return res.status(404).json({ error: "Crédito não encontrado." });
    const access = await assertProjectAccess(prisma, user, existing.projectId, true);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const { dataCredito, valor, notaCredito, linhas } = req.body as {
      dataCredito?: string;
      valor?: string | number;
      notaCredito?: string | null;
      linhas: { expenseNatureId: number; saldoNatureza: string | number }[];
    };

    const valorDec = valor != null ? dec(valor) : dec(existing.valor);
    const natureIds = linhas.map((l) => l.expenseNatureId);
    const uniq = new Set(natureIds);
    if (uniq.size !== natureIds.length) {
      const dup = natureIds.find((nid, i) => natureIds.indexOf(nid) !== i);
      const nat = await prisma.expenseNature.findUnique({ where: { id: dup! } });
      return res.status(400).json({
        error: `Natureza de Despesa repetida no mesmo Crédito Saldo: "${nat?.nome ?? dup}".`,
      });
    }
    let sumNat = new Prisma.Decimal(0);
    for (const l of linhas) {
      sumNat = sumNat.add(dec(l.saldoNatureza));
    }
    if (sumNat.gt(valorDec)) {
      return res.status(400).json({
        error: `A soma dos Saldos por Natureza (${sumNat.toFixed(2)}) não pode ser maior que o Valor do Crédito (${valorDec.toFixed(2)}).`,
      });
    }

    const orcamento = dec(existing.project.saldo);
    const somaOutrosCreditos = await sumCreditosValorExcluding(prisma, existing.projectId, id);
    const totalApos = somaOutrosCreditos.add(valorDec);
    if (totalApos.gt(orcamento)) {
      return res.status(400).json({
        error: `A soma dos valores dos Créditos Saldo do projeto não pode ultrapassar o Saldo Orçamentário (${orcamento.toFixed(2)}). Soma dos demais créditos: ${somaOutrosCreditos.toFixed(2)}; novo valor deste crédito: ${valorDec.toFixed(2)}; total seria: ${totalApos.toFixed(2)}.`,
      });
    }

    try {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.creditBalanceNature.deleteMany({ where: { creditBalanceId: id } });
        await tx.creditBalance.update({
          where: { id },
          data: {
            ...(dataCredito && { dataCredito: new Date(dataCredito) }),
            ...(valor != null && { valor: valorDec }),
            ...(notaCredito !== undefined && { notaCredito }),
            lines: {
              create: linhas.map((l) => ({
                expenseNatureId: l.expenseNatureId,
                saldoNatureza: dec(l.saldoNatureza),
              })),
            },
          },
        });
        return tx.creditBalance.findUnique({
          where: { id },
          include: { lines: { include: { expenseNature: true } } },
        });
      });
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Erro ao atualizar crédito." });
    }
  });

  app.delete("/api/creditos-saldo/:id", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    if (!isAdminOrFinanceiro(user)) return res.status(403).json({ error: "Sem permissão." });
    const id = Number(req.params.id);
    const existing = await prisma.creditBalance.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Crédito não encontrado." });
    const access = await assertProjectAccess(prisma, user, existing.projectId, true);
    if (!access.ok) return res.status(access.status).json({ error: access.error });
    await prisma.creditBalance.delete({ where: { id } });
    res.json({ success: true });
  });

  // --- Histórico remanejamentos ---
  app.get("/api/creditos-saldo/:id/remanejamentos", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    const id = Number(req.params.id);
    const cb = await prisma.creditBalance.findUnique({ where: { id } });
    if (!cb) return res.status(404).json({ error: "Crédito não encontrado." });
    const access = await assertProjectAccess(prisma, user, cb.projectId, false);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const list = await prisma.creditReallocation.findMany({
      where: { creditBalanceId: id },
      orderBy: { createdAt: "desc" },
      include: {
        sourceNature: true,
        destNature: true,
        user: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
    });
    res.json(
      list.map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        valor: r.valor.toString(),
        observacao: r.observacao,
        naturezaOrigem: r.sourceNature,
        naturezaDestino: r.destNature,
        usuario: r.user
          ? `${r.user.firstName ?? ""} ${r.user.lastName ?? ""} (${r.user.username})`.trim()
          : null,
      })),
    );
  });

  // --- Remanejamento ---
  app.post("/api/creditos-saldo/:id/remanejamentos", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    const uperm = await loadUserPerm(prisma, user.id);
    if (!canRemanejar(user, uperm?.podeRemanejarCredito ?? false)) {
      return res.status(403).json({ error: "Sem permissão para Remanejamento de Crédito." });
    }
    if (!isAdminOrFinanceiro(user)) return res.status(403).json({ error: "Sem permissão." });

    const creditBalanceId = Number(req.params.id);
    const { linhaOrigemId, naturezaDestinoId, valor, observacao } = req.body as {
      linhaOrigemId: number;
      naturezaDestinoId: number;
      valor: string | number;
      observacao?: string;
    };

    const valorDec = dec(valor);
    if (valorDec.lte(0)) return res.status(400).json({ error: "Valor deve ser maior que zero." });

    const line = await prisma.creditBalanceNature.findUnique({
      where: { id: linhaOrigemId },
      include: { creditBalance: true, expenseNature: true },
    });
    if (!line || line.creditBalanceId !== creditBalanceId) {
      return res.status(400).json({ error: "Linha de origem inválida para este crédito." });
    }

    const projectId = line.creditBalance.projectId;
    const access = await assertProjectAccess(prisma, user, projectId, true);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    if (line.expenseNatureId === naturezaDestinoId) {
      return res.status(400).json({ error: "Natureza de destino deve ser diferente da origem." });
    }

    const committed = await committedByNature(prisma, projectId);
    const com = committed.get(line.expenseNatureId) ?? new Prisma.Decimal(0);
    const disp = disponivelLinha(line.saldoNatureza, com);

    if (valorDec.gt(disp)) {
      return res.status(400).json({
        error: `Valor acima do saldo disponível na linha de origem. Disponível: ${disp.toFixed(2)}; comprometido (projeto/natureza): ${com.toFixed(2)}.`,
      });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const newOrig = dec(line.saldoNatureza).sub(valorDec);
        await tx.creditBalanceNature.update({
          where: { id: line.id },
          data: { saldoNatureza: newOrig },
        });

        const dest = await tx.creditBalanceNature.findFirst({
          where: {
            creditBalanceId,
            expenseNatureId: naturezaDestinoId,
          },
        });

        if (dest) {
          await tx.creditBalanceNature.update({
            where: { id: dest.id },
            data: { saldoNatureza: dec(dest.saldoNatureza).add(valorDec) },
          });
        } else {
          await tx.creditBalanceNature.create({
            data: {
              creditBalanceId,
              expenseNatureId: naturezaDestinoId,
              saldoNatureza: valorDec,
            },
          });
        }

        const rec = await tx.creditReallocation.create({
          data: {
            creditBalanceId,
            sourceNatureId: line.expenseNatureId,
            destNatureId: naturezaDestinoId,
            valor: valorDec,
            observacao: observacao ?? null,
            userId: user.id,
          },
        });
        return rec;
      });

      res.status(201).json({
        ...result,
        projectId,
        valor: result.valor.toString(),
      });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Erro no remanejamento." });
    }
  });

  // --- Ações de execução ---
  app.post("/api/projetos/:projectId/acoes-execucao", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    if (!isAdminOrFinanceiro(user)) return res.status(403).json({ error: "Sem permissão." });
    const projectId = Number(req.params.projectId);
    const access = await assertProjectAccess(prisma, user, projectId, true);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const { expenseNatureId, descricao, valor } = req.body as {
      expenseNatureId: number;
      descricao: string;
      valor: string | number;
    };
    const valorDec = dec(valor);
    const limite = await limiteNatureza(prisma, projectId, expenseNatureId);
    const committed = await committedByNature(prisma, projectId);
    const com = committed.get(expenseNatureId) ?? new Prisma.Decimal(0);
    const novoTotal = com.add(valorDec);
    if (limite.lte(0) && valorDec.gt(0)) {
      return res.status(400).json({
        error:
          "Não existe Crédito Saldo alocado a esta Natureza de Despesa neste projeto (soma das linhas Crédito Saldo Natureza é zero). Inclua a natureza nas linhas de um Crédito Saldo antes de criar ações de execução.",
      });
    }
    if (novoTotal.gt(limite)) {
      return res.status(400).json({
        error: `Saldo por natureza (Crédito Saldo Natureza no projeto): ${limite.toFixed(2)}. Já comprometido em ações: ${com.toFixed(2)}. Novo valor: ${valorDec.toFixed(2)}. O total não pode ultrapassar o crédito-saldo desta natureza.`,
      });
    }

    const created = await prisma.executionAction.create({
      data: { projectId, expenseNatureId, descricao, valor: valorDec },
      include: { expenseNature: true },
    });
    res.status(201).json({ ...created, valor: created.valor.toString() });
  });

  app.patch("/api/acoes-execucao/:id", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    if (!isAdminOrFinanceiro(user)) return res.status(403).json({ error: "Sem permissão." });
    const id = Number(req.params.id);
    const ex = await prisma.executionAction.findUnique({ where: { id } });
    if (!ex) return res.status(404).json({ error: "Ação não encontrada." });
    const access = await assertProjectAccess(prisma, user, ex.projectId, true);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const { expenseNatureId, descricao, valor } = req.body as {
      expenseNatureId?: number;
      descricao?: string;
      valor?: string | number;
    };

    const natureId = expenseNatureId ?? ex.expenseNatureId;
    const valorDec = valor != null ? dec(valor) : dec(ex.valor);

    const limite = await limiteNatureza(prisma, ex.projectId, natureId);
    const committed = await committedByNature(prisma, ex.projectId, id);
    const com = committed.get(natureId) ?? new Prisma.Decimal(0);
    const novoTotal = com.add(valorDec);
    if (limite.lte(0) && valorDec.gt(0)) {
      return res.status(400).json({
        error:
          "Não existe Crédito Saldo alocado a esta Natureza de Despesa neste projeto. Inclua a natureza nas linhas de um Crédito Saldo antes de associar ações.",
      });
    }
    if (novoTotal.gt(limite)) {
      return res.status(400).json({
        error: `Saldo por natureza (Crédito Saldo Natureza no projeto): ${limite.toFixed(2)}. Já comprometido nas demais ações (sem esta linha): ${com.toFixed(2)}. Novo valor: ${valorDec.toFixed(2)}. O total não pode ultrapassar o crédito-saldo desta natureza.`,
      });
    }

    const updated = await prisma.executionAction.update({
      where: { id },
      data: {
        ...(expenseNatureId != null && { expenseNatureId: natureId }),
        ...(descricao != null && { descricao }),
        ...(valor != null && { valor: valorDec }),
      },
      include: { expenseNature: true },
    });
    res.json({ ...updated, valor: updated.valor.toString() });
  });

  app.delete("/api/acoes-execucao/:id", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "Não autorizado" });
    if (!isAdminOrFinanceiro(user)) return res.status(403).json({ error: "Sem permissão." });
    const id = Number(req.params.id);
    const ex = await prisma.executionAction.findUnique({ where: { id } });
    if (!ex) return res.status(404).json({ error: "Ação não encontrada." });
    const access = await assertProjectAccess(prisma, user, ex.projectId, true);
    if (!access.ok) return res.status(access.status).json({ error: access.error });
    await prisma.executionAction.delete({ where: { id } });
    res.json({ success: true });
  });
}
