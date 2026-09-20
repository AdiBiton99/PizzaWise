import type { DesiredOptionTag } from '@pizzawise/shared'

interface BuilderStepProps {
  readonly legend: string
  readonly inputType: 'radio' | 'checkbox'
  readonly name: string
  readonly options: readonly { readonly tag: DesiredOptionTag, readonly label: string }[]
  readonly selectedTags: readonly DesiredOptionTag[]
  readonly onToggle: (tag: DesiredOptionTag) => void
}

export function BuilderStep({
  legend,
  inputType,
  name,
  options,
  selectedTags,
  onToggle
}: BuilderStepProps) {
  return (
    <fieldset className="builder-options">
      <legend>{legend}</legend>
      <ul>
        {options.map((option) => {
          const checked = selectedTags.includes(option.tag)

          return (
            <li key={option.tag}>
              <label className={checked ? 'is-selected' : undefined}>
                <input
                  type={inputType}
                  name={name}
                  value={option.tag}
                  checked={checked}
                  onChange={() => onToggle(option.tag)}
                />
                {option.label}
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}
