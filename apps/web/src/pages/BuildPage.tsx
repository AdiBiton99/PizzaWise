import { Link } from 'react-router'
import { useAppSession } from '../app/AppSession'
import { WorkflowProgress } from '../app/WorkflowProgress'
import { PizzaBuilder } from '../features/pizza-builder/PizzaBuilder'
import { useTranslate } from '../i18n'

export function BuildPage() {
  const t = useTranslate()
  const { pizza, loadedFavorite, setPizza } = useAppSession()

  return (
    <div className="page-stack">
      <WorkflowProgress current="build" />
      <header className="page-intro">
        <p className="eyebrow">{t('workflow.stepOf', { current: 1, total: 5 })}</p>
        <h1>{t('build.title')}</h1>
        <p>{t('build.lead')}</p>
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
          {t('build.continue')}
        </Link>
      </div>
    </div>
  )
}
