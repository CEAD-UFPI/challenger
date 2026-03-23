/** Mesmo segredo em todo o backend (login + rotas financeiras). */
export const JWT_SECRET =
  process.env.JWT_SECRET ?? "segredo-super-secreto-mude-em-producao";
