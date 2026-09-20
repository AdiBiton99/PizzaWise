import { Link, NavLink } from 'react-router'
import { LanguageSwitcher, useTranslate } from '../i18n'
import { useAppSession } from './AppSession'

export function AppHeader() {
  const { user } = useAppSession()
  const t = useTranslate()

  return (
    <header className="app-header" dir="ltr">
      <NavLink className="brand" to="/">
        PizzaWise
      </NavLink>
      <nav className="app-nav" aria-label={t('nav.main')}>
        <NavLink to="/" end>
          {t('nav.home')}
        </NavLink>
        <NavLink to="/build">{t('nav.build')}</NavLink>
        {user !== null && <NavLink to="/favorites">{t('nav.favorites')}</NavLink>}
        {user !== null && <NavLink to="/orders">{t('nav.orders')}</NavLink>}
        {user !== null && <NavLink to="/account">{t('nav.account')}</NavLink>}
      </nav>
      <div className="header-tools">
        <LanguageSwitcher />
        {user === null && (
          <div className="auth-actions">
            <Link className="button-secondary" to="/account?mode=login">
              {t('nav.login')}
            </Link>
            <Link className="button-primary" to="/account?mode=register">
              {t('nav.signup')}
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
