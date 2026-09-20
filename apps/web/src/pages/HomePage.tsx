import { Link } from 'react-router'
import { listFavorites } from '../features/favorites/favorites-api'
import { type FavoritePizza } from '@pizzawise/shared'
import { useEffect, useState } from 'react'
import { useAppSession } from '../app/AppSession'
import { FavoritePizzaSummary } from '../features/favorites/FavoritePizzaSummary'
import { useTranslate } from '../i18n'
import { BUILD_IMAGE, HERO_IMAGE } from '../media'

export function HomePage() {
  const t = useTranslate()
  const { user } = useAppSession()
  const [favorites, setFavorites] = useState<readonly FavoritePizza[]>([])

  useEffect(() => {
    if (user === null) {
      return
    }

    let cancelled = false
    void listFavorites()
      .then((nextFavorites) => {
        if (!cancelled) {
          setFavorites(nextFavorites.slice(0, 3))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFavorites([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [user])

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-copy">
          {t('home.eyebrow').length > 0 && (
            <p className="eyebrow">{t('home.eyebrow')}</p>
          )}
          <h1>{t('home.title')}</h1>
          <p>{t('home.lead')}</p>
          <Link className="button-primary" to="/build">
            {t('home.cta')}
          </Link>
        </div>
        <img className="hero-image" src={HERO_IMAGE} alt={t('media.heroAlt')} />
      </section>

      <section className="steps-section" aria-labelledby="how-it-works">
        <h2 id="how-it-works">{t('home.how')}</h2>
        <ol className="steps-grid">
          <li className="surface-card">
            <span className="step-number">1</span>
            <h3>{t('home.step1Title')}</h3>
            <p>{t('home.step1Body')}</p>
          </li>
          <li className="surface-card">
            <span className="step-number">2</span>
            <h3>{t('home.step2Title')}</h3>
            <p>{t('home.step2Body')}</p>
          </li>
          <li className="surface-card">
            <span className="step-number">3</span>
            <h3>{t('home.step3Title')}</h3>
            <p>{t('home.step3Body')}</p>
          </li>
        </ol>
      </section>

      {user !== null && (
        <section className="surface-card favorites-preview" aria-labelledby="home-favorites">
          <div className="preview-copy">
            <h2 id="home-favorites">{t('home.favorites')}</h2>
            {favorites.length === 0 ? (
              <p>{t('home.favoritesEmpty')}</p>
            ) : (
              <ul>
                {favorites.map((favorite) => (
                  <li key={favorite.id}>
                    <strong>{favorite.name}</strong>
                    <FavoritePizzaSummary
                      configuration={favorite.configuration}
                      t={t}
                    />
                  </li>
                ))}
              </ul>
            )}
            <Link className="button-secondary" to="/favorites">
              {t('home.openFavorites')}
            </Link>
          </div>
          <img src={BUILD_IMAGE} alt={t('media.buildAlt')} />
        </section>
      )}
    </div>
  )
}
