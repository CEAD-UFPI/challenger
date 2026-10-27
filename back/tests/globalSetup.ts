import { execSync } from "child_process";
import "dotenv/config";

// Recria o banco de teste do zero antes da suíte (apenas se TEST_DATABASE_URL existir)
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    console.warn("\n⚠️  TEST_DATABASE_URL não definida: testes de integração serão ignorados.\n");
    return;
  }
  if (url === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL não pode ser igual a DATABASE_URL (o banco é apagado).");
  }
  execSync("npx prisma migrate reset --force --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url, SEED_DEMO: "true", SEED_ADMIN_PASSWORD: "123456" },
  });
}
