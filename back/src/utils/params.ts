import { AppError } from "./AppError";

export const parseId = (value: unknown) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError("ID inválido", 400);
  return id;
};
