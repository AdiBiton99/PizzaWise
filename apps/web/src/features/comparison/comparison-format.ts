import type { EtaRange, Money } from '@pizzawise/shared'
import { translateEn, type Translate } from '../../i18n'

export function formatPrice (
  money: Money,
  t: Translate = translateEn
): string {
  const amount = (money.amountMinor / 100).toFixed(2)
  if (money.currency === 'ILS') {
    return t('format.priceIls', { amount })
  }

  return t('format.price', { amount, currency: money.currency })
}

export function formatDistanceKm (
  distanceKm: number,
  t: Translate = translateEn
): string {
  return t('format.km', { value: distanceKm.toFixed(1) })
}

export function formatEta (
  eta: EtaRange | null,
  t: Translate = translateEn
): string {
  if (eta === null) {
    return t('format.etaUnknown')
  }

  if (eta.minMinutes === eta.maxMinutes) {
    return t('format.etaMinutes', { minutes: eta.minMinutes })
  }

  return t('format.etaRange', { min: eta.minMinutes, max: eta.maxMinutes })
}
