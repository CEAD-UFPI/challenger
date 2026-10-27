import { describe, expect, it } from "vitest";
import { api, hasDb, login } from "./helpers";

describe.skipIf(!hasDb)("autenticação", () => {
  it("faz login e devolve perfis do usuário", async () => {
    const res = await api()
      .post("/api/login")
      .send({ email: "ADMIN@ufpi.edu.br", password: "123456" });
    expect(res.status).toBe(200);
    expect(res.body.user.roles).toContain("ADMIN");
    expect(res.body.token).toBeTruthy();
  });

  it("recusa senha errada", async () => {
    const res = await api()
      .post("/api/login")
      .send({ email: "admin@ufpi.edu.br", password: "errada" });
    expect(res.status).toBe(401);
  });

  it("nunca expõe o hash da senha", async () => {
    const token = await login("admin@ufpi.edu.br");
    const me = await api().get("/api/me").set("Authorization", token);
    const users = await api().get("/api/users").set("Authorization", token);
    expect(JSON.stringify(me.body)).not.toContain("passwordHash");
    expect(JSON.stringify(users.body)).not.toContain("passwordHash");
  });

  it("troca a senha do próprio usuário", async () => {
    const token = await login("professor@ufpi.edu.br");

    const wrong = await api()
      .put("/api/me/senha")
      .set("Authorization", token)
      .send({ senhaAtual: "errada", novaSenha: "nova1234" });
    expect(wrong.status).toBe(400);

    const ok = await api()
      .put("/api/me/senha")
      .set("Authorization", token)
      .send({ senhaAtual: "123456", novaSenha: "nova1234" });
    expect(ok.status).toBe(200);

    await login("professor@ufpi.edu.br", "nova1234");

    // Restaura a senha para os demais testes
    const token2 = await login("professor@ufpi.edu.br", "nova1234");
    await api()
      .put("/api/me/senha")
      .set("Authorization", token2)
      .send({ senhaAtual: "nova1234", novaSenha: "123456" });
  });

  it("não aceita token de sessão como link de redefinição", async () => {
    const token = await login("admin@ufpi.edu.br");
    const res = await api()
      .post("/api/auth/reset-password")
      .send({ token: token.replace("Bearer ", ""), password: "qualquer123" });
    expect(res.status).toBe(401);
  });
});
