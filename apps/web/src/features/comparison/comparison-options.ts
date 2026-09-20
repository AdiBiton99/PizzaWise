import { translateEn, type Translate } from '../../i18n'

export const COMPARISON_RADIUS_OPTIONS = [5, 10, 15, 25, 50, 'all'] as const
export const DEFAULT_COMPARISON_RADIUS_KM = 5

export type ComparisonRadiusKm = (typeof COMPARISON_RADIUS_OPTIONS)[number]

export function radiusOptionLabel (
  option: ComparisonRadiusKm,
  t: Translate = translateEn
): string {
  return option === 'all' ? t('radius.all') : t('radius.km', { km: option })
}
