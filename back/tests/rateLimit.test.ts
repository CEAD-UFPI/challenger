import { describe, expect, it } from "vitest";
import { api, hasDb } from "./helpers";

// LOGIN_RATE_LIMIT=5 no ambiente de teste
describe.skipIf(!hasDb)("limite de tentativas de login", () => {
  it("bloqueia o IP após 5 falhas", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await api()
        .post("/api/login")
        .send({ email: "admin@ufpi.edu.br", password: "errada" });
      expect(res.status).toBe(401);
    }
    const blocked = await api()
      .post("/api/login")
      .send({ email: "admin@ufpi.edu.br", password: "123456" });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toMatch(/Muitas tentativas/);
  });
});
