export function formatCurrency(amount?: number | null, currency = 'USD', locale = 'en-US') {
  if (amount == null || Number.isNaN(amount)) return ''
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}
