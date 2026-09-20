import { useTranslate } from '../../i18n'
import {
  COMPARISON_RADIUS_OPTIONS,
  radiusOptionLabel,
  type ComparisonRadiusKm
} from '../comparison/comparison-options'

interface RadiusPickerProps {
  readonly radiusKm: ComparisonRadiusKm
  readonly onChange: (radiusKm: ComparisonRadiusKm) => void
}

export function RadiusPicker({ radiusKm, onChange }: RadiusPickerProps) {
  const t = useTranslate()

  return (
    <fieldset className="builder-options option-pills">
      <legend>{t('location.searchRadius')}</legend>
      <ul>
        {COMPARISON_RADIUS_OPTIONS.map((option) => (
          <li key={option}>
            <label className={radiusKm === option ? 'is-selected' : undefined}>
              <input
                type="radio"
                name="search-radius"
                value={option}
                checked={radiusKm === option}
                onChange={() => onChange(option)}
              />
              {radiusOptionLabel(option, t)}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  )
}
