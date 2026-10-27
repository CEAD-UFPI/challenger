// Remove campos sensíveis antes de devolver usuários ao cliente
export const sanitizeUser = <T extends { passwordHash?: string }>(user: T) => {
  const { passwordHash, ...safe } = user;
  return safe;
};

// Usado como "json replacer" do Express: nenhuma resposta jamais expõe o hash
export const jsonReplacer = (key: string, value: unknown) =>
  key === "passwordHash" ? undefined : value;
