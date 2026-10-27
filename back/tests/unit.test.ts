import { describe, expect, it } from "vitest";
import { createSolicitationSchema } from "../src/services/solicitationService";
import { api, solicitationPayload } from "./helpers";

describe("createSolicitationSchema", () => {
  it("aceita um payload válido e converte tipos", () => {
    const data = createSolicitationSchema.parse(
      solicitationPayload({ agentIds: ["2", 3], projetoId: "1" }),
    );
    expect(data.agentIds).toEqual([2, 3]);
    expect(data.projetoId).toBe(1);
    expect(data.dataIda).toBeInstanceOf(Date);
  });

  it("limita a quantidade de diárias a 3,5", () => {
    expect(() => createSolicitationSchema.parse(solicitationPayload({ qtdDiarias: 4 }))).toThrow();
    expect(() =>
      createSolicitationSchema.parse(solicitationPayload({ qtdDiarias: 3.5 })),
    ).not.toThrow();
  });

  it("exige diárias em múltiplos de 0,5", () => {
    expect(() =>
      createSolicitationSchema.parse(solicitationPayload({ qtdDiarias: 1.3 })),
    ).toThrow();
  });

  it("rejeita volta anterior à ida", () => {
    expect(() =>
      createSolicitationSchema.parse(
        solicitationPayload({ dataIda: "2030-03-12T08:00", dataVolta: "2030-03-10T08:00" }),
      ),
    ).toThrow(/data de volta/);
  });

  it("exige ao menos um agente", () => {
    expect(() => createSolicitationSchema.parse(solicitationPayload({ agentIds: [] }))).toThrow();
  });
});

describe("rotas sem banco", () => {
  it("health responde ok", async () => {
    const res = await api().get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("bloqueia rotas protegidas sem token", async () => {
    const res = await api().get("/api/users");
    expect(res.status).toBe(401);
  });

  it("rejeita token inválido", async () => {
    const res = await api().get("/api/solicitacoes").set("Authorization", "Bearer abc.def.ghi");
    expect(res.status).toBe(401);
  });
});
