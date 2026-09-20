import { Link, Navigate, useParams } from 'react-router'
import { type FormEvent, useEffect, useState } from 'react'
import { useAppSession } from '../app/AppSession'
import { OrderConfirmation } from '../features/orders/OrderConfirmation'
import { WorkflowProgress } from '../app/WorkflowProgress'
import { OrdersRequestError, getOrder } from '../features/orders/orders-api'
import type { Order } from '@pizzawise/shared'
import { useTranslate } from '../i18n'
import {
  MAX_FAVORITE_NAME_LENGTH,
  MIN_FAVORITE_NAME_LENGTH,
  validateFavoriteName
} from '../features/favorites/favorite-validation'
import {
  FavoritesRequestError,
  createFavorite as requestCreateFavorite
} from '../features/favorites/favorites-api'

export function OrderConfirmationPage() {
  const t = useTranslate()
  const { id } = useParams<{ id: string }>()
  const {
    user,
    recentOrders,
    lastPlacedOrder,
    setUser,
    resetOrderFlow
  } = useAppSession()
  const known =
    lastPlacedOrder?.id === id
      ? lastPlacedOrder
      : recentOrders.find((order) => order.id === id)
  const [order, setOrder] = useState<Order | null>(known ?? null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [favoriteName, setFavoriteName] = useState('')
  const [favoriteBusy, setFavoriteBusy] = useState(false)
  const [favoriteError, setFavoriteError] = useState<string | null>(null)
  const [favoriteSaved, setFavoriteSaved] = useState(false)

  useEffect(() => {
    if (id === undefined || known !== undefined) {
      return
    }

    let cancelled = false
    void getOrder(id)
      .then((nextOrder) => {
        if (!cancelled) {
          setOrder(nextOrder)
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }
        if (error instanceof OrdersRequestError && error.code === 'unauthorized') {
          setUser(null)
          return
        }
        setErrorMessage(
          error instanceof OrdersRequestError
            ? error.message
            : t('confirm.loadFailed')
        )
      })

    return () => {
      cancelled = true
    }
  }, [id, known, setUser, t])

  useEffect(() => {
    if (order === null) {
      return
    }

    resetOrderFlow()
  }, [order, resetOrderFlow])

  async function handleSaveFavorite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (order === null) {
      return
    }

    const nameError = validateFavoriteName(favoriteName)
    if (nameError !== null) {
      setFavoriteError(
        t(nameError, {
          min: MIN_FAVORITE_NAME_LENGTH,
          max: MAX_FAVORITE_NAME_LENGTH
        })
      )
      return
    }

    setFavoriteBusy(true)
    setFavoriteError(null)

    try {
      await requestCreateFavorite(favoriteName.trim(), order.configuration)
      setFavoriteSaved(true)
      setFavoriteName('')
    } catch (error) {
      if (error instanceof FavoritesRequestError && error.code === 'unauthorized') {
        setUser(null)
        return
      }

      setFavoriteError(
        error instanceof FavoritesRequestError
          ? error.message
          : t('confirm.favoriteFailed')
      )
    } finally {
      setFavoriteBusy(false)
    }
  }

  if (user === null) {
    return <Navigate to="/account?mode=login" replace />
  }

  if (id === undefined) {
    return <Navigate to="/orders" replace />
  }

  return (
    <div className="page-stack">
      <WorkflowProgress current="confirm" />
      <header className="page-intro">
        <p className="eyebrow">{t('workflow.stepOf', { current: 5, total: 5 })}</p>
        <h1>{t('confirm.title')}</h1>
      </header>
      <div className="surface-card">
        {order !== null ? (
          <>
            <OrderConfirmation order={order} heading={t('confirm.placed')} />
            <form
              className="account-form"
              noValidate
              onSubmit={(event) => void handleSaveFavorite(event)}
            >
              <h2>{t('confirm.addFavorite')}</h2>
              <label htmlFor="confirm-favorite-name">{t('favorites.name')}</label>
              <input
                id="confirm-favorite-name"
                type="text"
                maxLength={80}
                value={favoriteName}
                disabled={favoriteBusy || favoriteSaved}
                onChange={(event) => setFavoriteName(event.target.value)}
              />
              <button type="submit" disabled={favoriteBusy || favoriteSaved}>
                {favoriteBusy ? t('favorites.saving') : t('confirm.saveFavorite')}
              </button>
              {favoriteSaved && <p>{t('confirm.favoriteSaved')}</p>}
              {favoriteError !== null && <p role="alert">{favoriteError}</p>}
            </form>
          </>
        ) : errorMessage !== null ? (
          <p role="alert">{errorMessage}</p>
        ) : (
          <p>{t('confirm.loading')}</p>
        )}
      </div>
      <div className="builder-actions">
        <Link className="button-primary" to="/orders">
          {t('confirm.history')}
        </Link>
        <Link className="button-secondary" to="/build">
          {t('confirm.another')}
        </Link>
      </div>
    </div>
  )
}
