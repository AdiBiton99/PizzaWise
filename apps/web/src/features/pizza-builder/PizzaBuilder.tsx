import {
  pizzaOptionLabel,
  type DesiredOptionTag,
  type PizzaConfiguration
} from '@pizzawise/shared'
import { useState } from 'react'
import { BuilderStep } from './BuilderStep'
import {
  CRUST_OPTIONS,
  SAUCE_OPTIONS,
  SIZE_OPTIONS,
  TOPPING_OPTIONS
} from './pizza-options'

type BuilderStage = 'size' | 'crust' | 'sauce' | 'toppings' | 'complete'

interface PizzaBuilderProps {
  readonly initialConfiguration?: PizzaConfiguration | null
  readonly onConfigurationCompleted: (
    configuration: PizzaConfiguration | null
  ) => void
}

export function PizzaBuilder({
  initialConfiguration = null,
  onConfigurationCompleted
}: PizzaBuilderProps) {
  const [stage, setStage] = useState<BuilderStage>(
    initialConfiguration === null ? 'size' : 'complete'
  )
  const [sizeTag, setSizeTag] = useState<DesiredOptionTag | null>(
    initialConfiguration?.sizeTag ?? null
  )
  const [crustTag, setCrustTag] = useState<DesiredOptionTag | null>(
    initialConfiguration?.crustTag ?? null
  )
  const [sauceTag, setSauceTag] = useState<DesiredOptionTag | null>(
    initialConfiguration?.sauceTag ?? null
  )
  const [toppingTags, setToppingTags] = useState<readonly DesiredOptionTag[]>(
    initialConfiguration?.toppingTags ?? []
  )

  const canContinue =
    (stage === 'size' && sizeTag !== null) ||
    (stage === 'crust' && crustTag !== null) ||
    (stage === 'sauce' && sauceTag !== null) ||
    stage === 'toppings'

  function handleContinue() {
    if (!canContinue) {
      return
    }

    if (stage === 'size') {
      setStage('crust')
      return
    }

    if (stage === 'crust') {
      setStage('sauce')
      return
    }

    if (stage === 'sauce') {
      setStage('toppings')
      return
    }

    if (sizeTag === null || crustTag === null || sauceTag === null) {
      return
    }

    const sortedToppings = [...toppingTags].sort((left, right) =>
      left.localeCompare(right)
    )
    const configuration: PizzaConfiguration = {
      sizeTag,
      crustTag,
      sauceTag,
      toppingTags: sortedToppings
    }

    setToppingTags(sortedToppings)
    onConfigurationCompleted(configuration)
    setStage('complete')
  }

  function handleBack() {
    if (stage === 'crust') {
      setStage('size')
      return
    }

    if (stage === 'sauce') {
      setStage('crust')
      return
    }

    if (stage === 'toppings') {
      setStage('sauce')
      return
    }

    if (stage === 'complete') {
      onConfigurationCompleted(null)
      setStage('toppings')
    }
  }

  function toggleTopping(tag: DesiredOptionTag) {
    setToppingTags((current) =>
      current.includes(tag)
        ? current.filter((existing) => existing !== tag)
        : [...current, tag]
    )
  }

  return (
    <section className="pizza-builder" aria-labelledby="pizza-builder-heading">
      <h2 id="pizza-builder-heading">Pizza Builder</h2>
      <ol className="builder-stepper" aria-label="Builder steps">
        {(['size', 'crust', 'sauce', 'toppings', 'complete'] as const).map(
          (item, index) => (
            <li
              key={item}
              aria-current={stage === item ? 'step' : undefined}
              className={stage === item ? 'is-current' : undefined}
            >
              {index < 4 ? ['Size', 'Crust', 'Sauce', 'Toppings'][index] : 'Ready'}
            </li>
          )
        )}
      </ol>

      {stage === 'size' && (
        <BuilderStep
          legend="Size"
          inputType="radio"
          name="size"
          options={SIZE_OPTIONS}
          selectedTags={sizeTag === null ? [] : [sizeTag]}
          onToggle={setSizeTag}
        />
      )}

      {stage === 'crust' && (
        <BuilderStep
          legend="Crust"
          inputType="radio"
          name="crust"
          options={CRUST_OPTIONS}
          selectedTags={crustTag === null ? [] : [crustTag]}
          onToggle={setCrustTag}
        />
      )}

      {stage === 'sauce' && (
        <BuilderStep
          legend="Sauce"
          inputType="radio"
          name="sauce"
          options={SAUCE_OPTIONS}
          selectedTags={sauceTag === null ? [] : [sauceTag]}
          onToggle={setSauceTag}
        />
      )}

      {stage === 'toppings' && (
        <BuilderStep
          legend="Toppings"
          inputType="checkbox"
          name="toppings"
          options={TOPPING_OPTIONS}
          selectedTags={toppingTags}
          onToggle={toggleTopping}
        />
      )}

      {stage === 'complete' && sizeTag !== null && crustTag !== null && sauceTag !== null && (
        <PizzaSummary
          configuration={{
            sizeTag,
            crustTag,
            sauceTag,
            toppingTags
          }}
        />
      )}

      <div className="builder-actions">
        {stage !== 'size' && (
          <button type="button" onClick={handleBack}>
            Back
          </button>
        )}
        {stage !== 'complete' && (
          <button
            type="button"
            className="button-primary"
            disabled={!canContinue}
            onClick={handleContinue}
          >
            Continue
          </button>
        )}
      </div>
    </section>
  )
}

function PizzaSummary({
  configuration
}: {
  readonly configuration: PizzaConfiguration
}) {
  const toppingSummary =
    configuration.toppingTags.length === 0
      ? 'None'
      : configuration.toppingTags.map(pizzaOptionLabel).join(', ')

  return (
    <div className="pizza-summary">
      <h3>Your pizza</h3>
      <dl>
        <div>
          <dt>Size</dt>
          <dd>{pizzaOptionLabel(configuration.sizeTag)}</dd>
        </div>
        <div>
          <dt>Crust</dt>
          <dd>{pizzaOptionLabel(configuration.crustTag)}</dd>
        </div>
        <div>
          <dt>Sauce</dt>
          <dd>{pizzaOptionLabel(configuration.sauceTag)}</dd>
        </div>
        <div>
          <dt>Toppings</dt>
          <dd>{toppingSummary}</dd>
        </div>
      </dl>
    </div>
  )
}
