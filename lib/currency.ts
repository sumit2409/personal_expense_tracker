export const currencies = {
  EUR: 'Euro', INR: 'Indian rupee', USD: 'US dollar', GBP: 'British pound',
  CAD: 'Canadian dollar', AUD: 'Australian dollar', CHF: 'Swiss franc',
  SGD: 'Singapore dollar', AED: 'UAE dirham', JPY: 'Japanese yen',
} as const;

export type Currency = keyof typeof currencies;
export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && Object.hasOwn(currencies, value);
}
export function currencyScale(currency: Currency): number {
  return currency === 'JPY' ? 1 : 100;
}
export function toMinorUnits(amount: number, currency: Currency): number | null {
  const scaled = amount * currencyScale(currency);
  const rounded = Math.round(scaled);
  return Number.isFinite(amount) && rounded > 0 && Number.isSafeInteger(rounded)
    && Math.abs(scaled - rounded) < 0.000001 ? rounded : null;
}
export function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat('en', { style: 'currency', currency, currencyDisplay: 'code' }).format(amount);
}
