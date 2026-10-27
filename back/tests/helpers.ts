import request from "supertest";
import { app } from "../src/app";

export const hasDb = !!process.env.TEST_DATABASE_URL;
export const api = () => request(app);

export const login = async (email: string, password = "123456") => {
  const res = await api().post("/api/login").send({ email, password });
  if (res.status !== 200) throw new Error(`Login falhou para ${email}: ${res.text}`);
  return `Bearer ${res.body.token}` as const;
};

export const solicitationPayload = (overrides: Record<string, unknown> = {}) => ({
  motivo: "Participação em congresso nacional",
  origem: "TERESINA - PI",
  destino: "PARNAÍBA - PI",
  dataIda: "2030-03-10T08:00",
  dataVolta: "2030-03-12T18:00",
  projetoId: 1,
  tipoDiariaId: 1,
  objectiveId: 1,
  agentIds: [2],
  qtdDiarias: 2,
  meioTransporte: "AEREO",
  tipoViagem: "NACIONAL",
  ...overrides,
});
