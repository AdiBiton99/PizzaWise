import { type FormEvent, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import type { FavoritePizza, PizzaConfiguration } from '@pizzawise/shared'
import { useAppSession } from '../app/AppSession'
import { PizzaBuilder } from '../features/pizza-builder/PizzaBuilder'
import {
  MAX_FAVORITE_NAME_LENGTH,
  MIN_FAVORITE_NAME_LENGTH,
  validateFavoriteName
} from '../features/favorites/favorite-validation'
import {
  FavoritesRequestError,
  createFavorite as requestCreate,
  listFavorites as requestList,
  updateFavorite as requestUpdate
} from '../features/favorites/favorites-api'
import { useTranslate } from '../i18n'

export function FavoriteComposePage() {
  const t = useTranslate()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user, sessionStatus, setUser } = useAppSession()
  const isEdit = id !== undefined
  const [existing, setExisting] = useState<FavoritePizza | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(isEdit)
  const [name, setName] = useState('')
  const [pizza, setPizza] = useState<PizzaConfiguration | null>(null)
  const [builderKey, setBuilderKey] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit || id === undefined) {
      return
    }

    let cancelled = false
    setIsLoading(true)
    void requestList()
      .then((favorites) => {
        if (cancelled) {
          return
        }
        const match = favorites.find((favorite) => favorite.id === id)
        if (match === undefined) {
          setLoadError(t('favorites.notFound'))
          setIsLoading(false)
          return
        }
        setExisting(match)
        setName(match.name)
        setPizza(match.configuration)
        setBuilderKey((key) => key + 1)
        setIsLoading(false)
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }
        if (error instanceof FavoritesRequestError && error.code === 'unauthorized') {
          setUser(null)
          return
        }
        setLoadError(
          error instanceof FavoritesRequestError
            ? error.message
            : t('favorites.loadFailed')
        )
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, isEdit, setUser, t])

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pizza === null) {
      return
    }

    const nameError = validateFavoriteName(name)
    if (nameError !== null) {
      setErrorMessage(
        t(nameError, {
          min: MIN_FAVORITE_NAME_LENGTH,
          max: MAX_FAVORITE_NAME_LENGTH
        })
      )
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    try {
      if (isEdit && existing !== null) {
        await requestUpdate(existing.id, name.trim(), pizza)
      } else {
        await requestCreate(name.trim(), pizza)
      }
      void navigate('/favorites')
    } catch (error) {
      if (error instanceof FavoritesRequestError && error.code === 'unauthorized') {
        setUser(null)
        return
      }
      setErrorMessage(
        error instanceof FavoritesRequestError
          ? error.message
          : t(isEdit ? 'favorites.updateFailed' : 'favorites.saveFailed')
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (sessionStatus === 'loading') {
    return <p>{t('session.checking')}</p>
  }

  if (user === null) {
    return <Navigate to="/account?mode=login" replace />
  }

  const canSave = pizza !== null && !isSaving && !isLoading

  return (
    <div className="page-stack">
      <header className="page-intro">
        <p className="eyebrow">{t('favorites.eyebrow')}</p>
        <h1>{isEdit ? t('favorites.editTitle') : t('favorites.composeTitle')}</h1>
        <p>{isEdit ? t('favorites.editLead') : t('favorites.composeLead')}</p>
      </header>
      {isLoading ? (
        <p>{t('favorites.loading')}</p>
      ) : loadError !== null ? (
        <div className="surface-card">
          <p role="alert">{loadError}</p>
        </div>
      ) : (
        <>
          <div className="surface-card">
            <PizzaBuilder
              key={builderKey}
              initialConfiguration={existing?.configuration ?? null}
              allowStepNavigation={isEdit}
              onConfigurationCompleted={setPizza}
            />
          </div>
          {pizza !== null ? (
            <form
              className="surface-card account-form"
              noValidate
              onSubmit={(event) => void handleSave(event)}
            >
              <label htmlFor="favorite-compose-name">{t('favorites.name')}</label>
              <input
                id="favorite-compose-name"
                type="text"
                maxLength={80}
                value={name}
                disabled={isSaving}
                onChange={(event) => setName(event.target.value)}
              />
              <div className="builder-actions">
                <button type="submit" className="button-primary" disabled={!canSave}>
                  {isSaving
                    ? t('favorites.saving')
                    : isEdit
                      ? t('favorites.saveChanges')
                      : t('favorites.save')}
                </button>
                <Link className="button-secondary" to="/favorites">
                  {t('favorites.cancel')}
                </Link>
              </div>
              {errorMessage !== null && <p role="alert">{errorMessage}</p>}
            </form>
          ) : (
            <p>{t('favorites.needPizza')}</p>
          )}
        </>
      )}
    </div>
  )
}
