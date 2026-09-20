import {
  type DesiredOptionTag,
  type PizzaConfiguration
} from '@pizzawise/shared'
import { useState } from 'react'
import { optionLabel, useTranslate } from '../../i18n'
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
  const t = useTranslate()
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

  function labeled (tags: readonly DesiredOptionTag[]) {
    return tags.map((tag) => ({ tag, label: optionLabel(t, tag) }))
  }

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

  const stepLabels = [
    t('builder.size'),
    t('builder.crust'),
    t('builder.sauce'),
    t('builder.toppings'),
    t('builder.ready')
  ] as const

  return (
    <section className="pizza-builder" aria-labelledby="pizza-builder-heading">
      <h2 id="pizza-builder-heading">{t('builder.heading')}</h2>
      <ol className="builder-stepper" aria-label={t('builder.stepsAria')}>
        {(['size', 'crust', 'sauce', 'toppings', 'complete'] as const).map(
          (item, index) => (
            <li
              key={item}
              aria-current={stage === item ? 'step' : undefined}
              className={stage === item ? 'is-current' : undefined}
            >
              {stepLabels[index]}
            </li>
          )
        )}
      </ol>

      {stage === 'size' && (
        <BuilderStep
          legend={t('builder.size')}
          inputType="radio"
          name="size"
          options={labeled(SIZE_OPTIONS)}
          selectedTags={sizeTag === null ? [] : [sizeTag]}
          onToggle={setSizeTag}
        />
      )}

      {stage === 'crust' && (
        <BuilderStep
          legend={t('builder.crust')}
          inputType="radio"
          name="crust"
          options={labeled(CRUST_OPTIONS)}
          selectedTags={crustTag === null ? [] : [crustTag]}
          onToggle={setCrustTag}
        />
      )}

      {stage === 'sauce' && (
        <BuilderStep
          legend={t('builder.sauce')}
          inputType="radio"
          name="sauce"
          options={labeled(SAUCE_OPTIONS)}
          selectedTags={sauceTag === null ? [] : [sauceTag]}
          onToggle={setSauceTag}
        />
      )}

      {stage === 'toppings' && (
        <BuilderStep
          legend={t('builder.toppings')}
          inputType="checkbox"
          name="toppings"
          options={labeled(TOPPING_OPTIONS)}
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
            {t('builder.back')}
          </button>
        )}
        {stage !== 'complete' && (
          <button
            type="button"
            className="button-primary"
            disabled={!canContinue}
            onClick={handleContinue}
          >
            {t('builder.continue')}
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
  const t = useTranslate()
  const toppingSummary =
    configuration.toppingTags.length === 0
      ? t('builder.none')
      : configuration.toppingTags.map((tag) => optionLabel(t, tag)).join(', ')

  return (
    <div className="pizza-summary">
      <h3>{t('builder.yourPizza')}</h3>
      <dl>
        <div>
          <dt>{t('builder.size')}</dt>
          <dd>{optionLabel(t, configuration.sizeTag)}</dd>
        </div>
        <div>
          <dt>{t('builder.crust')}</dt>
          <dd>{optionLabel(t, configuration.crustTag)}</dd>
        </div>
        <div>
          <dt>{t('builder.sauce')}</dt>
          <dd>{optionLabel(t, configuration.sauceTag)}</dd>
        </div>
        <div>
          <dt>{t('builder.toppings')}</dt>
          <dd>{toppingSummary}</dd>
        </div>
      </dl>
    </div>
  )
}
