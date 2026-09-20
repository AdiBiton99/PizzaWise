import { FavoritePizzaSummary } from './FavoritePizzaSummary'
import { useTranslate } from '../../i18n'
import {
  type FavoritePizza,
  type PizzaConfiguration,
  type PublicUser
} from '@pizzawise/shared'
import { useCallback, useEffect, useState } from 'react'
import {
  type DeleteFavorite,
  type ListFavorites,
  FavoritesRequestError,
  deleteFavorite as requestDelete,
  listFavorites as requestList
} from './favorites-api'

interface FavoritesPanelProps {
  readonly user: PublicUser
  readonly onUserChange: (user: PublicUser | null) => void
  readonly onLoadFavorite: (configuration: PizzaConfiguration) => void
  readonly onEditFavorite: (favorite: FavoritePizza) => void
  readonly listFavorites?: ListFavorites
  readonly deleteFavorite?: DeleteFavorite
}

export function FavoritesPanel({
  user,
  onUserChange,
  onLoadFavorite,
  onEditFavorite,
  listFavorites = requestList,
  deleteFavorite = requestDelete
}: FavoritesPanelProps) {
  const t = useTranslate()
  const [favorites, setFavorites] = useState<readonly FavoritePizza[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [itemBusyId, setItemBusyId] = useState<string | null>(null)

  const handleUnauthorized = useCallback(() => {
    onUserChange(null)
  }, [onUserChange])

  const loadFavorites = useCallback(async () => {
    try {
      const nextFavorites = await listFavorites()
      setFavorites(nextFavorites)
      setErrorMessage(null)
    } catch (error) {
      if (error instanceof FavoritesRequestError && error.code === 'unauthorized') {
        handleUnauthorized()
        return
      }

      setErrorMessage(
        error instanceof FavoritesRequestError
          ? error.message
          : t('favorites.loadFailed')
      )
    } finally {
      setIsLoading(false)
    }
  }, [handleUnauthorized, listFavorites, t])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await loadFavorites()
      if (cancelled) {
        return
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadFavorites])

  async function handleDelete(id: string) {
    setItemBusyId(id)
    setErrorMessage(null)

    try {
      await deleteFavorite(id)
      setFavorites((current) => current.filter((item) => item.id !== id))
      setPendingDeleteId(null)
    } catch (error) {
      if (error instanceof FavoritesRequestError && error.code === 'unauthorized') {
        handleUnauthorized()
        return
      }

      setErrorMessage(
        error instanceof FavoritesRequestError
          ? error.message
          : t('favorites.deleteFailed')
      )
    } finally {
      setItemBusyId(null)
    }
  }

  return (
    <section className="favorites-panel" aria-labelledby="favorites-heading" data-user-id={user.id}>
      <h2 id="favorites-heading">{t('favorites.heading')}</h2>

      <div className="favorites-status" aria-live="polite" aria-busy={isLoading}>
        {isLoading && <p>{t('favorites.loading')}</p>}
        {errorMessage !== null && <p role="alert">{errorMessage}</p>}
        {!isLoading && favorites.length === 0 && errorMessage === null && (
          <p>{t('favorites.empty')}</p>
        )}
      </div>

      {favorites.length > 0 && (
        <ul className="favorites-list">
          {favorites.map((favorite) => (
            <li key={favorite.id}>
              <div className="favorite-copy">
                <h3>{favorite.name}</h3>
                <FavoritePizzaSummary
                  configuration={favorite.configuration}
                  t={t}
                />
              </div>
              <div className="builder-actions">
                <button
                  type="button"
                  disabled={itemBusyId !== null}
                  onClick={() => onLoadFavorite(favorite.configuration)}
                >
                  {t('favorites.use')}
                </button>
                <button
                  type="button"
                  disabled={itemBusyId !== null}
                  onClick={() => onEditFavorite(favorite)}
                >
                  {t('favorites.edit')}
                </button>
                {pendingDeleteId === favorite.id ? (
                  <>
                    <button
                      type="button"
                      disabled={itemBusyId === favorite.id}
                      onClick={() => void handleDelete(favorite.id)}
                    >
                      {t('favorites.confirmDelete')}
                    </button>
                    <button
                      type="button"
                      disabled={itemBusyId === favorite.id}
                      onClick={() => setPendingDeleteId(null)}
                    >
                      {t('favorites.cancel')}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={itemBusyId !== null}
                    onClick={() => setPendingDeleteId(favorite.id)}
                  >
                    {t('favorites.delete')}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
