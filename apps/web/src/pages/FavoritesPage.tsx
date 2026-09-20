import { useNavigate } from 'react-router'
import type { FavoritePizza } from '@pizzawise/shared'
import { useAppSession } from '../app/AppSession'
import { FavoritesPanel } from '../features/favorites/FavoritesPanel'
import { useTranslate } from '../i18n'

export function FavoritesPage() {
  const t = useTranslate()
  const { user, setUser, loadFavorite } = useAppSession()
  const navigate = useNavigate()

  if (user === null) {
    return null
  }

  return (
    <div className="page-stack">
      <header className="page-intro">
        <p className="eyebrow">{t('favorites.eyebrow')}</p>
        <h1>{t('favorites.title')}</h1>
        <p>{t('favorites.lead')}</p>
        <div className="builder-actions">
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              void navigate('/favorites/new')
            }}
          >
            {t('favorites.addPizza')}
          </button>
        </div>
      </header>
      <div className="surface-card">
        <FavoritesPanel
          key={user.id}
          user={user}
          onUserChange={setUser}
          onLoadFavorite={(configuration) => {
            loadFavorite(configuration)
            void navigate('/build')
          }}
          onEditFavorite={(favorite: FavoritePizza) => {
            void navigate(`/favorites/${favorite.id}/edit`)
          }}
        />
      </div>
    </div>
  )
}
