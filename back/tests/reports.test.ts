import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { ensureUser } from "./fixtures";
import { api, hasDb, login, solicitationPayload } from "./helpers";

const PDF = Buffer.from("%PDF-1.4\n%teste\n");

describe.skipIf(!hasDb)("relatórios de viagem", () => {
  let prof: string, fadex: string, outro: string;
  let reportId: number;

  beforeAll(async () => {
    await ensureUser("fadex2@teste.br", ["FADEX"], "90000000003");
    await ensureUser("outro@teste.br", ["AGENTE"], "90000000004");
    prof = await login("professor@ufpi.edu.br");
    fadex = await login("fadex2@teste.br");
    outro = await login("outro@teste.br");

    const sol = await api()
      .post("/api/solicitacoes")
      .set("Authorization", prof)
      .send(solicitationPayload());
    reportId = sol.body.details[0].report.id;
  });

  const upload = (token: string, file = PDF, name = "comprovante.pdf", type = "application/pdf") =>
    api()
      .post(`/api/relatorios/${reportId}/comprovante`)
      .set("Authorization", token)
      .field("atividadesRealizadas", "Apresentei o trabalho no congresso.")
      .attach("file", file, { filename: name, contentType: type });

  it("recusa formato de arquivo não permitido", async () => {
    const res = await upload(prof, Buffer.from("x"), "script.exe", "application/x-msdownload");
    expect(res.status).toBe(400);
  });

  it("outro usuário não vê nem envia o relatório", async () => {
    expect((await upload(outro)).status).toBe(404);
  });

  it("agente envia, FADEX devolve, agente reenvia e FADEX aprova", async () => {
    const sent = await upload(prof);
    expect(sent.status).toBe(200);
    expect(sent.body.status).toBe("FECHADO");

    const file = await api()
      .get(`/api/relatorios/${reportId}/comprovante`)
      .set("Authorization", fadex)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      });
    expect(file.status).toBe(200);
    expect(Buffer.compare(file.body, PDF)).toBe(0);

    // Não pode reenviar enquanto está em análise
    expect((await upload(prof)).status).toBe(409);

    const review = (body: object) =>
      api().patch(`/api/relatorios/${reportId}/status`).set("Authorization", fadex).send(body);

    expect((await review({ action: "REJECT" })).status).toBe(400);
    const rejected = await review({ action: "REJECT", motivoRecusa: "DADOS_INCORRETOS" });
    expect(rejected.body.status).toBe("EM_CORRECAO");

    expect((await upload(prof)).body.status).toBe("FECHADO");

    const approved = await review({ action: "APPROVE" });
    expect(approved.body.status).toBe("APROVADO");
    expect(approved.body.history.map((h: { acao: string }) => h.acao)).toEqual([
      "APROVADO",
      "ENVIADO",
      "DEVOLVIDO",
      "ENVIADO",
    ]);
  });

  it("bloqueia nova viagem de agente com relatório vencido", async () => {
    const agente = await ensureUser("atrasado@teste.br", ["AGENTE"], "90000000005");
    const sol = await api()
      .post("/api/solicitacoes")
      .set("Authorization", prof)
      .send(solicitationPayload({ agentIds: [agente.id] }));
    await prisma.travelReport.update({
      where: { id: sol.body.details[0].report.id },
      data: { prazoLimite: new Date("2020-01-01") },
    });

    const blocked = await api()
      .post("/api/solicitacoes")
      .set("Authorization", prof)
      .send(solicitationPayload({ agentIds: [agente.id] }));
    expect(blocked.status).toBe(422);
    expect(blocked.body.error).toMatch(/Bloqueado/);
  });
});
