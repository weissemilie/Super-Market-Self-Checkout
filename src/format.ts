const currencyFormatter = new Intl.NumberFormat('da-DK', {
  style: 'currency',
  currency: 'DKK',
})

export function formatPrice(amountDkk: number): string {
  return currencyFormatter.format(amountDkk).replace(/\.$/, '')
}
