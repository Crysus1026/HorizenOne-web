export function formatCurrencyFromCents(
  valueCents?: number
): string {
  const normalizedValue =
    typeof valueCents === "number" && Number.isFinite(valueCents)
      ? valueCents
      : 0;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(normalizedValue / 100);
}

export function convertDollarsToCents(value: string): number {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return Math.round(parsedValue * 100);
}