import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router'
import { AppHeader } from './app/AppLayout'
import { AppSessionProvider } from './app/AppSession'
import { RequireAuth } from './app/RequireAuth'
import { RequireLocation, RequirePizza } from './app/WorkflowGuards'
import { LocaleProvider } from './i18n'
import { AccountPage } from './pages/AccountPage'
import { BuildPage } from './pages/BuildPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { ComparePage } from './pages/ComparePage'
import { FavoritesPage } from './pages/FavoritesPage'
import { HomePage } from './pages/HomePage'
import { LocationPage } from './pages/LocationPage'
import { OrderConfirmationPage } from './pages/OrderConfirmationPage'
import { OrdersPage } from './pages/OrdersPage'
import './App.css'

function AppShell() {
  return (
    <div className="app-shell">
      <AppHeader />
      <main>
        <Outlet />
      </main>
    </div>
  )
}

function App() {
  return (
    <LocaleProvider>
      <BrowserRouter>
        <AppSessionProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/build" element={<BuildPage />} />
            <Route element={<RequirePizza />}>
              <Route path="/location" element={<LocationPage />} />
              <Route element={<RequireLocation />}>
                <Route path="/compare" element={<ComparePage />} />
              </Route>
            </Route>
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/order/:id" element={<OrderConfirmationPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/orders" element={<OrdersPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        </AppSessionProvider>
      </BrowserRouter>
    </LocaleProvider>
  )
}

export default App
