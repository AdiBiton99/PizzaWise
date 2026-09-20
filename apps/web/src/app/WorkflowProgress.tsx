import { Link } from 'react-router'
import { useTranslate, type MessageKey } from '../i18n'
import { useAppSession } from './AppSession'

export type WorkflowStepId =
  | 'build'
  | 'location'
  | 'compare'
  | 'checkout'
  | 'confirm'

const STEPS: readonly {
  readonly id: WorkflowStepId
  readonly labelKey: MessageKey
  readonly to: string
}[] = [
  { id: 'build', labelKey: 'workflow.build', to: '/build' },
  { id: 'location', labelKey: 'workflow.location', to: '/location' },
  { id: 'compare', labelKey: 'workflow.compare', to: '/compare' },
  { id: 'checkout', labelKey: 'workflow.checkout', to: '/checkout' },
  { id: 'confirm', labelKey: 'workflow.confirm', to: '/orders' }
]

export function WorkflowProgress({
  current
}: {
  readonly current: WorkflowStepId
}) {
  const t = useTranslate()
  const { pizza, location, checkoutPizzeriaId, comparisonOutcome } =
    useAppSession()
  const currentIndex = STEPS.findIndex((step) => step.id === current)

  return (
    <ol className="workflow-progress" aria-label={t('workflow.aria')}>
      {STEPS.map((step, index) => {
        const isCurrent = step.id === current
        const reachable = canReachStep(step.id, {
          pizzaReady: pizza !== null,
          locationReady: location !== null,
          checkoutReady:
            checkoutPizzeriaId !== null &&
            comparisonOutcome?.kind === 'success'
        })

        return (
          <li
            key={step.id}
            className={
              isCurrent ? 'is-current' : index < currentIndex ? 'is-done' : undefined
            }
            aria-current={isCurrent ? 'step' : undefined}
          >
            {reachable && !isCurrent && step.id !== 'confirm' ? (
              <Link to={step.to}>{`${index + 1}. ${t(step.labelKey)}`}</Link>
            ) : (
              <span>{`${index + 1}. ${t(step.labelKey)}`}</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function canReachStep (
  id: WorkflowStepId,
  ready: {
    readonly pizzaReady: boolean
    readonly locationReady: boolean
    readonly checkoutReady: boolean
  }
): boolean {
  if (id === 'build') {
    return true
  }

  if (id === 'location') {
    return ready.pizzaReady
  }

  if (id === 'compare') {
    return ready.pizzaReady && ready.locationReady
  }

  if (id === 'checkout') {
    return ready.pizzaReady && ready.locationReady && ready.checkoutReady
  }

  return false
}
