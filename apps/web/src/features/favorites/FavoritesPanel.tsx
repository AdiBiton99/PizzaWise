import { FavoritePizzaSummary } from './FavoritePizzaSummary'
import { useTranslate } from '../../i18n'
import {
  type FavoritePizza,
  type PizzaConfiguration,
  type PublicUser
} from '@pizzawise/shared'
import { type FormEvent, useCallback, useEffect, useState } from 'react'
import {
  MAX_FAVORITE_NAME_LENGTH,
  MIN_FAVORITE_NAME_LENGTH,
  validateFavoriteName
} from './favorite-validation'
import {
  type CreateFavorite,
  type DeleteFavorite,
  type ListFavorites,
  type UpdateFavorite,
  FavoritesRequestError,
  createFavorite as requestCreate,
  deleteFavorite as requestDelete,
  listFavorites as requestList,
  updateFavorite as requestUpdate
} from './favorites-api'

interface FavoritesPanelProps {
  readonly user: PublicUser
  readonly pizza: PizzaConfiguration | null
  readonly onUserChange: (user: PublicUser | null) => void
  readonly onLoadFavorite: (configuration: PizzaConfiguration) => void
  readonly listFavorites?: ListFavorites
  readonly createFavorite?: CreateFavorite
  readonly updateFavorite?: UpdateFavorite
  readonly deleteFavorite?: DeleteFavorite
}

export function FavoritesPanel({
  user,
  pizza,
  onUserChange,
  onLoadFavorite,
  listFavorites = requestList,
  createFavorite = requestCreate,
  updateFavorite = requestUpdate,
  deleteFavorite = requestDelete
}: FavoritesPanelProps) {
  const t = useTranslate()
  const [favorites, setFavorites] = useState<readonly FavoritePizza[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [saveName, setSaveName] = useState('')
  const [saveBusy, setSaveBusy] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [replaceWithCurrent, setReplaceWithCurrent] = useState(false)
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

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pizza === null) {
      return
    }

    const nameError = validateFavoriteName(saveName)
    if (nameError !== null) {
      setErrorMessage(
        t(nameError, {
          min: MIN_FAVORITE_NAME_LENGTH,
          max: MAX_FAVORITE_NAME_LENGTH
        })
      )
      return
    }

    setSaveBusy(true)
    setErrorMessage(null)

    try {
      const created = await createFavorite(saveName.trim(), pizza)
      setFavorites((current) => sortFavorites([...current, created]))
      setSaveName('')
    } catch (error) {
      if (error instanceof FavoritesRequestError && error.code === 'unauthorized') {
        handleUnauthorized()
        return
      }

      setErrorMessage(
        error instanceof FavoritesRequestError
          ? error.message
          : t('favorites.saveFailed')
      )
    } finally {
      setSaveBusy(false)
    }
  }

  function startEdit(favorite: FavoritePizza) {
    setPendingDeleteId(null)
    setEditingId(favorite.id)
    setEditName(favorite.name)
    setReplaceWithCurrent(false)
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (editingId === null) {
      return
    }

    const favorite = favorites.find((item) => item.id === editingId)
    if (favorite === undefined) {
      return
    }

    const nameError = validateFavoriteName(editName)
    if (nameError !== null) {
      setErrorMessage(
        t(nameError, {
          min: MIN_FAVORITE_NAME_LENGTH,
          max: MAX_FAVORITE_NAME_LENGTH
        })
      )
      return
    }

    const nextConfiguration =
      replaceWithCurrent && pizza !== null
        ? pizza
        : favorite.configuration

    setItemBusyId(editingId)
    setErrorMessage(null)

    try {
      const updated = await updateFavorite(
        editingId,
        editName.trim(),
        nextConfiguration
      )
      setFavorites((current) =>
        sortFavorites(
          current.map((item) => (item.id === updated.id ? updated : item))
        )
      )
      setEditingId(null)
    } catch (error) {
      if (error instanceof FavoritesRequestError && error.code === 'unauthorized') {
        handleUnauthorized()
        return
      }

      setErrorMessage(
        error instanceof FavoritesRequestError
          ? error.message
          : t('favorites.updateFailed')
      )
    } finally {
      setItemBusyId(null)
    }
  }

  async function handleDelete(id: string) {
    setItemBusyId(id)
    setErrorMessage(null)

    try {
      await deleteFavorite(id)
      setFavorites((current) => current.filter((item) => item.id !== id))
      setPendingDeleteId(null)
      if (editingId === id) {
        setEditingId(null)
      }
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

      <form className="account-form" noValidate onSubmit={(event) => void handleSave(event)}>
        <label htmlFor="favorite-name">{t('favorites.name')}</label>
        <input
          id="favorite-name"
          type="text"
          maxLength={80}
          value={saveName}
          disabled={saveBusy || pizza === null}
          onChange={(event) => setSaveName(event.target.value)}
        />
        <button type="submit" disabled={saveBusy || pizza === null}>
          {saveBusy ? t('favorites.saving') : t('favorites.save')}
        </button>
        {pizza === null && (
          <p>{t('favorites.needPizza')}</p>
        )}
      </form>

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
              {editingId === favorite.id ? (
                <form
                  className="account-form"
                  noValidate
                  onSubmit={(event) => void handleUpdate(event)}
                >
                  <label htmlFor={`favorite-edit-${favorite.id}`}>{t('favorites.editName')}</label>
                  <input
                    id={`favorite-edit-${favorite.id}`}
                    type="text"
                    maxLength={80}
                    value={editName}
                    disabled={itemBusyId === favorite.id}
                    onChange={(event) => setEditName(event.target.value)}
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={replaceWithCurrent}
                      disabled={pizza === null || itemBusyId === favorite.id}
                      onChange={(event) =>
                        setReplaceWithCurrent(event.target.checked)
                      }
                    />
                    {t('favorites.replace')}
                  </label>
                  <div className="builder-actions">
                    <button type="submit" disabled={itemBusyId === favorite.id}>
                      {itemBusyId === favorite.id ? t('favorites.saving') : t('favorites.saveChanges')}
                    </button>
                    <button
                      type="button"
                      disabled={itemBusyId === favorite.id}
                      onClick={() => setEditingId(null)}
                    >
                      {t('favorites.cancel')}
                    </button>
                  </div>
                </form>
              ) : (
                <>
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
                      onClick={() => startEdit(favorite)}
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
                        onClick={() => {
                          setEditingId(null)
                          setPendingDeleteId(favorite.id)
                        }}
                      >
                        {t('favorites.delete')}
                      </button>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function sortFavorites (
  favorites: readonly FavoritePizza[]
): FavoritePizza[] {
  return [...favorites].sort((left, right) => {
    const nameDifference = left.name.localeCompare(right.name)
    if (nameDifference !== 0) {
      return nameDifference
    }

    return left.id.localeCompare(right.id)
  })
}
