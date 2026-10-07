const currencyFormatter = new Intl.NumberFormat('da-DK', {
  style: 'currency',
  currency: 'DKK',
})

export function formatPrice(amountDkk: number): string {
  return currencyFormatter.format(amountDkk).replace(/\.$/, '')
}

export function formatTimeOfDay(timestampMs: number): string {
  return new Date(timestampMs).toLocaleTimeString('da-DK', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
