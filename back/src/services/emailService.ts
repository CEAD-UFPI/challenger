import nodemailer from "nodemailer";
import { env } from "../config/env";

const transporter = nodemailer.createTransport(
  env.SMTP_HOST
    ? {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ?? 587,
        secure: (env.SMTP_PORT ?? 587) === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      }
    : {
        // Sem SMTP_HOST, usa o Gmail/Google Workspace
        service: "gmail",
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      },
);

const isConfigured = () => !!(env.SMTP_USER && env.SMTP_PASS);

const layout = (title: string, body: string, link: string, buttonLabel: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
    <h2 style="color: #4f46e5;">${title}</h2>
    ${body}
    <div style="text-align: center; margin: 30px 0;">
      <a href="${link}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">${buttonLabel}</a>
    </div>
    <p style="color: #64748b; font-size: 12px;">Se o botão não funcionar, copie e cole este link no seu navegador: <br/>${link}</p>
  </div>
`;

// Retorna false quando o SMTP não está configurado (o link fica no log do servidor)
const send = async (to: string, subject: string, html: string, link: string) => {
  if (!isConfigured()) {
    console.warn(`⚠️ SMTP não configurado. Link para ${to}: ${link}`);
    return false;
  }
  try {
    await transporter.sendMail({
      from: env.SMTP_FROM || `"Challenger CEAD" <${env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("❌ Erro ao enviar e-mail:", error);
    throw new Error("Não foi possível enviar o e-mail.");
  }
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const sendConfirmationEmail = async (
  email: string,
  firstName: string,
  token: string,
) => {
  const link = `${env.FRONTEND_URL}/completar-registo?token=${encodeURIComponent(token)}`;
  const html = layout(
    `Olá, ${escapeHtml(firstName)}!`,
    `<p>A sua conta no sistema <strong>Challenger - Controle de Diárias e Passagens</strong> foi criada com sucesso.</p>
     <p>Para ativar a sua conta e definir a sua senha, clique no botão abaixo (válido por 48 horas):</p>`,
    link,
    "Completar Cadastro",
  );
  return send(email, "Challenger - Acesso Criado e Confirmação de Cadastro", html, link);
};

export const sendResetPasswordEmail = async (
  email: string,
  firstName: string,
  token: string,
) => {
  const link = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const html = layout(
    `Olá, ${escapeHtml(firstName)}!`,
    `<p>Recebemos um pedido para redefinir a sua senha no sistema <strong>Challenger</strong>.</p>
     <p>Clique no botão abaixo para criar uma nova senha (válido por 1 hora). Se não foi você, ignore este e-mail.</p>`,
    link,
    "Redefinir Senha",
  );
  return send(email, "Challenger - Redefinição de Senha", html, link);
};
