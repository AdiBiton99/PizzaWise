import { Link } from 'react-router'
import { listFavorites } from '../features/favorites/favorites-api'
import { pizzaOptionLabel, type FavoritePizza } from '@pizzawise/shared'
import { useEffect, useState } from 'react'
import { useAppSession } from '../app/AppSession'
import { BUILD_IMAGE, BUILD_IMAGE_ALT, HERO_IMAGE, HERO_IMAGE_ALT } from '../media'

export function HomePage() {
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
          <p className="eyebrow">Neighborhood pizza, made easy</p>
          <h1>Your perfect pizza is closer than you think.</h1>
          <p>
            Build it your way, and we’ll help you find the right place to order
            it from.
          </p>
          <Link className="button-primary" to="/build">
            Build my pizza
          </Link>
        </div>
        <img className="hero-image" src={HERO_IMAGE} alt={HERO_IMAGE_ALT} />
      </section>

      <section className="steps-section" aria-labelledby="how-it-works">
        <h2 id="how-it-works">How PizzaWise works</h2>
        <ol className="steps-grid">
          <li className="surface-card">
            <span className="step-number">1</span>
            <h3>Build</h3>
            <p>Pick size, crust, sauce, and toppings in a guided flow.</p>
          </li>
          <li className="surface-card">
            <span className="step-number">2</span>
            <h3>Compare</h3>
            <p>See nearby pizzerias ranked for your exact pizza.</p>
          </li>
          <li className="surface-card">
            <span className="step-number">3</span>
            <h3>Order</h3>
            <p>Checkout with a live price from the shop you choose.</p>
          </li>
        </ol>
      </section>

      {user !== null && (
        <section className="surface-card favorites-preview" aria-labelledby="home-favorites">
          <div className="preview-copy">
            <h2 id="home-favorites">Your favorites</h2>
            {favorites.length === 0 ? (
              <p>Save a pizza after you build one.</p>
            ) : (
              <ul>
                {favorites.map((favorite) => (
                  <li key={favorite.id}>
                    <strong>{favorite.name}</strong>
                    <p className="favorite-config">
                      {pizzaOptionLabel(favorite.configuration.sizeTag)},{' '}
                      {pizzaOptionLabel(favorite.configuration.crustTag)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Link className="button-secondary" to="/favorites">
              Open favorites
            </Link>
          </div>
          <img src={BUILD_IMAGE} alt={BUILD_IMAGE_ALT} />
        </section>
      )}
    </div>
  )
}
