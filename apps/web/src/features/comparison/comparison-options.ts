export const COMPARISON_RADIUS_OPTIONS = [5, 10, 15, 25, 50, 'all'] as const
export const DEFAULT_COMPARISON_RADIUS_KM = 5

export type ComparisonRadiusKm = (typeof COMPARISON_RADIUS_OPTIONS)[number]

export function radiusOptionLabel (option: ComparisonRadiusKm): string {
  return option === 'all' ? 'All' : `${option} km`
}
