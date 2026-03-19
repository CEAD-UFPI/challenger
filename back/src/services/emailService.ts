import nodemailer from "nodemailer";

export const sendConfirmationEmail = async (
  email: string,
  firstName: string,
  temporaryToken: string,
) => {
  // Configuração do Servidor SMTP
  // DICA: Para testar em desenvolvimento sem enviar e-mails reais, recomendo criar uma conta grátis no Mailtrap.io
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "sandbox.smtp.mailtrap.io",
    port: Number(process.env.SMTP_PORT) || 2525,
    auth: {
      user: process.env.SMTP_USER || "adicione_seu_user_aqui",
      pass: process.env.SMTP_PASS || "adicione_sua_pass_aqui",
    },
  });

  // O link que o agente vai clicar (vai direcionar para uma nova tela no frontend)
  const confirmationLink = `http://localhost:5173/completar-registo?token=${temporaryToken}`;

  const mailOptions = {
    from: '"Challenger CEAD" <nao-responder@cead.ufpi.br>',
    to: email,
    subject: "Challenger - Acesso Criado e Confirmação de Registo",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h2 style="color: #4f46e5;">Olá, ${firstName}!</h2>
        <p>A sua conta no sistema <strong>Challenger - Controlo de Diárias e Passagens</strong> foi criada com sucesso.</p>
        <p>Para ativar a sua conta, definir a sua palavra-passe e preencher os seus dados bancários e morada, clique no botão abaixo:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmationLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Completar Registo</a>
        </div>
        <p style="color: #64748b; font-size: 12px;">Se o botão não funcionar, copie e cole este link no seu navegador: <br/>${confirmationLink}</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`E-mail enviado com sucesso para ${email}`);
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error);
    throw new Error("Não foi possível enviar o e-mail de confirmação.");
  }
};
