import type { EtaRange, Money } from '@pizzawise/shared'

export function formatPrice (money: Money): string {
  return `${(money.amountMinor / 100).toFixed(2)} ${money.currency}`
}

export function formatDistanceKm (distanceKm: number): string {
  return `${distanceKm.toFixed(1)} km`
}

export function formatEta (eta: EtaRange | null): string {
  if (eta === null) {
    return 'Unknown'
  }

  if (eta.minMinutes === eta.maxMinutes) {
    return `${eta.minMinutes} min`
  }

  return `${eta.minMinutes}–${eta.maxMinutes} min`
}
