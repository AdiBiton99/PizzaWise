import { Link } from 'react-router'
import { useAppSession } from '../app/AppSession'
import { WorkflowProgress } from '../app/WorkflowProgress'
import { PizzaBuilder } from '../features/pizza-builder/PizzaBuilder'

export function BuildPage() {
  const { pizza, loadedFavorite, setPizza } = useAppSession()

  return (
    <div className="page-stack">
      <WorkflowProgress current="build" />
      <header className="page-intro">
        <p className="eyebrow">Step 1 of 5</p>
        <h1>Build your pizza</h1>
        <p>Choose each part in order. You can go back without losing later picks.</p>
      </header>
      <div className="surface-card">
        <PizzaBuilder
          key={loadedFavorite?.nonce ?? 0}
          initialConfiguration={loadedFavorite?.configuration ?? pizza}
          onConfigurationCompleted={setPizza}
        />
      </div>
      <div className="builder-actions">
        <Link
          className={pizza === null ? 'button-primary is-disabled' : 'button-primary'}
          to="/location"
          aria-disabled={pizza === null}
          onClick={(event) => {
            if (pizza === null) {
              event.preventDefault()
            }
          }}
        >
          Continue to location
        </Link>
      </div>
    </div>
  )
}
