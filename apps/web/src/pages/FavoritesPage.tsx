import { useNavigate } from 'react-router'
import { useAppSession } from '../app/AppSession'
import { FavoritesPanel } from '../features/favorites/FavoritesPanel'

export function FavoritesPage() {
  const { user, pizza, setUser, loadFavorite } = useAppSession()
  const navigate = useNavigate()

  if (user === null) {
    return null
  }

  return (
    <div className="page-stack">
      <header className="page-intro">
        <p className="eyebrow">Saved pies</p>
        <h1>Favorites</h1>
        <p>Reuse a saved pizza in the builder, or replace it with the one you just made.</p>
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
