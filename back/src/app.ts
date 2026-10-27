import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { authenticate } from "./middlewares/auth";
import { errorHandler } from "./middlewares/errorHandler";
import { authRouter } from "./routes/auth.routes";
import { catalogRouter } from "./routes/catalog.routes";
import { projectsRouter } from "./routes/projects.routes";
import { reportsRouter } from "./routes/reports.routes";
import { solicitationsRouter } from "./routes/solicitations.routes";
import { usersRouter } from "./routes/users.routes";
import { jsonReplacer } from "./utils/sanitize";

export const app = express();

app.disable("x-powered-by");
// Atrás do Nginx, usa o IP real do cliente (X-Forwarded-For) no limite de tentativas
app.set("trust proxy", env.TRUST_PROXY);
app.set("json replacer", jsonReplacer);
app.use(cors({ origin: env.CORS_ORIGINS }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Rotas públicas (login, recuperação de senha, convite) + /me (autentica internamente)
app.use("/api", authRouter);

// Daqui em diante, todas as rotas exigem token válido
app.use("/api", authenticate);
app.use("/api", usersRouter);
app.use("/api", solicitationsRouter);
app.use("/api", projectsRouter);
app.use("/api", reportsRouter);
app.use("/api", catalogRouter);

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

app.use(errorHandler);
