import { Link } from 'react-router'
import { useAppSession } from './AppSession'

export type WorkflowStepId =
  | 'build'
  | 'location'
  | 'compare'
  | 'checkout'
  | 'confirm'

const STEPS: readonly {
  readonly id: WorkflowStepId
  readonly label: string
  readonly to: string
}[] = [
  { id: 'build', label: 'Build', to: '/build' },
  { id: 'location', label: 'Location', to: '/location' },
  { id: 'compare', label: 'Compare', to: '/compare' },
  { id: 'checkout', label: 'Checkout', to: '/checkout' },
  { id: 'confirm', label: 'Confirmation', to: '/orders' }
]

export function WorkflowProgress({
  current
}: {
  readonly current: WorkflowStepId
}) {
  const { pizza, location, checkoutPizzeriaId, comparisonOutcome } =
    useAppSession()
  const currentIndex = STEPS.findIndex((step) => step.id === current)

  return (
    <ol className="workflow-progress" aria-label="Order steps">
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
              <Link to={step.to}>{`${index + 1}. ${step.label}`}</Link>
            ) : (
              <span>{`${index + 1}. ${step.label}`}</span>
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
