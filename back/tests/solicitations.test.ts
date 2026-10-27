import { beforeAll, describe, expect, it } from "vitest";
import { ensureUser } from "./fixtures";
import { api, hasDb, login, solicitationPayload } from "./helpers";

describe.skipIf(!hasDb)("fluxo de solicitações", () => {
  let prof: string, dir: string, adm: string, fadex: string;

  beforeAll(async () => {
    await ensureUser("direcao@teste.br", ["DIRECAO"], "90000000001");
    await ensureUser("fadex@teste.br", ["FADEX"], "90000000002");
    prof = await login("professor@ufpi.edu.br");
    dir = await login("direcao@teste.br");
    fadex = await login("fadex@teste.br");
    adm = await login("admin@ufpi.edu.br");
  });

  const create = async () => {
    const res = await api()
      .post("/api/solicitacoes")
      .set("Authorization", prof)
      .send(solicitationPayload());
    expect(res.status).toBe(201);
    return res.body;
  };
  const setStatus = (token: string, id: number, body: object) =>
    api().patch(`/api/solicitacoes/${id}/status`).set("Authorization", token).send(body);

  it("cria a solicitação aguardando a Direção, com relatório gerado pelo trigger", async () => {
    const sol = await create();
    expect(sol.status).toBe("AGUARDANDO_DIRECAO");
    expect(sol.details[0].report.status).toBe("ABERTO");
  });

  it("ignora o perfil forjado enviado pelo cliente", async () => {
    const sol = await create();
    const res = await setStatus(prof, sol.id, { action: "APPROVE", role: "DIRECAO" });
    expect(res.status).toBe(403);
  });

  it("devolve, corrige, reenvia e segue até o pagamento", async () => {
    const sol = await create();

    expect((await setStatus(dir, sol.id, { action: "REJECT" })).status).toBe(400);

    const rejected = await setStatus(dir, sol.id, { action: "REJECT", reason: "Falta o TED" });
    expect(rejected.body.status).toBe("PENDENTE_CORRECAO");
    expect(rejected.body.observacaoDevolucao).toBe("Falta o TED");

    // Outro usuário não pode corrigir
    const forbidden = await api()
      .put(`/api/solicitacoes/${sol.id}`)
      .set("Authorization", dir)
      .send(solicitationPayload());
    expect(forbidden.status).toBe(403);

    const resent = await api()
      .put(`/api/solicitacoes/${sol.id}`)
      .set("Authorization", prof)
      .send(solicitationPayload({ motivo: "Motivo corrigido com o TED" }));
    expect(resent.status).toBe(200);
    expect(resent.body.status).toBe("AGUARDANDO_DIRECAO");
    expect(resent.body.observacaoDevolucao).toBeNull();
    expect(resent.body.motivoSolicitacao).toBe("Motivo corrigido com o TED");

    // Fora de PENDENTE_CORRECAO não se edita
    const again = await api()
      .put(`/api/solicitacoes/${sol.id}`)
      .set("Authorization", prof)
      .send(solicitationPayload());
    expect(again.status).toBe(409);

    expect((await setStatus(dir, sol.id, { action: "APPROVE" })).body.status).toBe(
      "AGUARDANDO_FINANCEIRO",
    );
    expect((await setStatus(adm, sol.id, { action: "APPROVE", role: "ADMIN" })).body.status).toBe(
      "APROVADO_PARA_PAGAMENTO",
    );
    expect((await setStatus(fadex, sol.id, { action: "PAY" })).body.status).toBe("PAGO");

    const del = await api().delete(`/api/solicitacoes/${sol.id}`).set("Authorization", adm);
    expect(del.status).toBe(403);
  });

  it("não permite aprovação fora da vez", async () => {
    const sol = await create();
    const res = await setStatus(adm, sol.id, { action: "APPROVE" });
    expect(res.status).toBe(409);
  });
});
