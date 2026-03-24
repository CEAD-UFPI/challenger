import nodemailer from "nodemailer";

export const sendConfirmationEmail = async (
  email: string,
  firstName: string,
  temporaryToken: string,
) => {
  // Configuração do Servidor SMTP para o GOOGLE (Gmail / Workspace)
  const transporter = nodemailer.createTransport({
    service: "gmail", // 👈 Isso resolve tudo! O Nodemailer já sabe qual host e porta usar
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // O link que o agente vai clicar (vai direcionar para uma nova tela no frontend)
  const confirmationLink = `http://localhost:5173/completar-registo?token=${temporaryToken}`;

  const mailOptions = {
    from: '"Challenger CEAD" <cticead@ufpi.edu.br>', // Coloque o mesmo do remetente real
    to: email,
    subject: "Challenger - Acesso Criado e Confirmação de Cadastro",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h2 style="color: #4f46e5;">Olá, ${firstName}!</h2>
        <p>A sua conta no sistema <strong>Challenger - Controle de Diárias e Passagens</strong> foi criada com sucesso.</p>
        <p>Para ativar a sua conta e definir a sua senha, clique no botão abaixo:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmationLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Completar Cadastro</a>
        </div>
        <p style="color: #64748b; font-size: 12px;">Se o botão não funcionar, copie e cole este link no seu navegador: <br/>${confirmationLink}</p>
      </div>
    `,
  };

  try {
    // 👇 ADICIONEI O CONSOLE.LOG PARA CASO O E-MAIL FALHE, VOCÊ AINDA TER O LINK!
    console.log(`\n🔗 LINK DE ATIVAÇÃO GERADO: ${confirmationLink}\n`);

    await transporter.sendMail(mailOptions);
    console.log(`✅ E-mail enviado com sucesso de verdade para ${email}`);
  } catch (error) {
    console.error("❌ Erro ao enviar e-mail:", error);
    throw new Error("Não foi possível enviar o e-mail de confirmação.");
  }
};
