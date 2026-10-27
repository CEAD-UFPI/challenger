// Os testes de integração usam um banco exclusivo, nunca o DATABASE_URL da aplicação
import "dotenv/config";
import os from "os";
import path from "path";

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "segredo-de-teste";
process.env.SMTP_USER = "";
process.env.SMTP_PASS = "";
process.env.LOGIN_RATE_LIMIT = "5";
process.env.UPLOAD_DIR = path.join(os.tmpdir(), "challenger-test-uploads");
