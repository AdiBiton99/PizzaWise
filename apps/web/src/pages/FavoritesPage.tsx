import { useNavigate } from 'react-router'
import { useAppSession } from '../app/AppSession'
import { FavoritesPanel } from '../features/favorites/FavoritesPanel'
import { useTranslate } from '../i18n'

export function FavoritesPage() {
  const t = useTranslate()
  const { user, pizza, setUser, loadFavorite } = useAppSession()
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
      </header>
      <div className="surface-card">
        <FavoritesPanel
          key={user.id}
          user={user}
          pizza={pizza}
          onUserChange={setUser}
          onLoadFavorite={(configuration) => {
            loadFavorite(configuration)
            void navigate('/build')
          }}
        />
      </div>
    </div>
  )
}
