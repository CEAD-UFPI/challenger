/** Formato brasileiro de moeda, ex.: R$ 9.999.999,99 */
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatMoneyBRL(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  return brl.format(Number.isNaN(n) ? 0 : n);
}
