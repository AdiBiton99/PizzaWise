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
  return (
    <fieldset className="builder-options option-pills">
      <legend>Search radius</legend>
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
              {radiusOptionLabel(option)}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  )
}
