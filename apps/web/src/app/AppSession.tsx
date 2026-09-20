import type {
  ComparisonPriority,
  Order,
  PizzaConfiguration,
  PublicUser,
  UserLocation
} from '@pizzawise/shared'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { getCurrentUser } from '../features/account/auth-api'
import { useTranslate } from '../i18n'
import type { ComparisonOutcome } from '../features/comparison/PizzaComparisonPanel'
import {
  DEFAULT_COMPARISON_RADIUS_KM,
  type ComparisonRadiusKm
} from '../features/comparison/comparison-options'

export type RankingChoice = 'balanced' | ComparisonPriority

interface LoadedFavorite {
  readonly nonce: number
  readonly configuration: PizzaConfiguration
}

interface AppSessionValue {
  readonly user: PublicUser | null
  readonly sessionStatus: 'loading' | 'ready'
  readonly sessionError: string | null
  readonly location: UserLocation | null
  readonly locationLabel: string | null
  readonly pizza: PizzaConfiguration | null
  readonly loadedFavorite: LoadedFavorite | null
  readonly radiusKm: ComparisonRadiusKm
  readonly ranking: RankingChoice
  readonly comparisonOutcome: ComparisonOutcome | null
  readonly checkoutPizzeriaId: string | null
  readonly lastPlacedOrder: Order | null
  readonly recentOrders: readonly Order[]
  readonly retrySession: () => void
  readonly setUser: (user: PublicUser | null) => void
  readonly setLocation: (location: UserLocation, label: string) => void
  readonly setPizza: (pizza: PizzaConfiguration | null) => void
  readonly loadFavorite: (configuration: PizzaConfiguration) => void
  readonly setRadiusKm: (radiusKm: ComparisonRadiusKm) => void
  readonly setRanking: (ranking: RankingChoice) => void
  readonly setComparisonOutcome: (outcome: ComparisonOutcome | null) => void
  readonly setCheckoutPizzeriaId: (id: string | null) => void
  readonly recordPlacedOrder: (order: Order) => void
}

const AppSessionContext = createContext<AppSessionValue | null>(null)

export function AppSessionProvider({ children }: { readonly children: ReactNode }) {
  const t = useTranslate()
  const [user, setUserState] = useState<PublicUser | null>(null)
  const [sessionStatus, setSessionStatus] = useState<'loading' | 'ready'>(
    'loading'
  )
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [sessionEpoch, setSessionEpoch] = useState(0)
  const [location, setLocationState] = useState<UserLocation | null>(null)
  const [locationLabel, setLocationLabel] = useState<string | null>(null)
  const [pizza, setPizza] = useState<PizzaConfiguration | null>(null)
  const [loadedFavorite, setLoadedFavorite] = useState<LoadedFavorite | null>(
    null
  )
  const [radiusKm, setRadiusKm] = useState<ComparisonRadiusKm>(
    DEFAULT_COMPARISON_RADIUS_KM
  )
  const [ranking, setRanking] = useState<RankingChoice>('balanced')
  const [comparisonOutcome, setComparisonOutcome] =
    useState<ComparisonOutcome | null>(null)
  const [checkoutPizzeriaId, setCheckoutPizzeriaId] = useState<string | null>(
    null
  )
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null)
  const [recentOrders, setRecentOrders] = useState<readonly Order[]>([])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const currentUser = await getCurrentUser()
        if (cancelled) {
          return
        }
        setUserState(currentUser)
        setSessionError(null)
        setSessionStatus('ready')
      } catch {
        if (cancelled) {
          return
        }
        setUserState(null)
        setLastPlacedOrder(null)
        setRecentOrders([])
        setSessionError(t('account.sessionFailed'))
        setSessionStatus('ready')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [sessionEpoch, t])

  const setUser = useCallback((nextUser: PublicUser | null) => {
    setUserState(nextUser)
    if (nextUser === null) {
      setLastPlacedOrder(null)
      setRecentOrders([])
    }
  }, [])

  const setLocation = useCallback((nextLocation: UserLocation, label: string) => {
    setLocationState(nextLocation)
    setLocationLabel(label)
  }, [])

  const loadFavorite = useCallback((configuration: PizzaConfiguration) => {
    setPizza(configuration)
    setLoadedFavorite((current) => ({
      nonce: (current?.nonce ?? 0) + 1,
      configuration
    }))
  }, [])

  const recordPlacedOrder = useCallback((order: Order) => {
    setLastPlacedOrder(order)
    setRecentOrders((current) =>
      current.some((item) => item.id === order.id)
        ? current
        : [order, ...current]
    )
    setCheckoutPizzeriaId(null)
  }, [])

  const value = useMemo<AppSessionValue>(
    () => ({
      user,
      sessionStatus,
      sessionError,
      location,
      locationLabel,
      pizza,
      loadedFavorite,
      radiusKm,
      ranking,
      comparisonOutcome,
      checkoutPizzeriaId,
      lastPlacedOrder,
      recentOrders,
      retrySession () {
        setSessionStatus('loading')
        setSessionEpoch((epoch) => epoch + 1)
      },
      setUser,
      setLocation,
      setPizza,
      loadFavorite,
      setRadiusKm,
      setRanking,
      setComparisonOutcome,
      setCheckoutPizzeriaId,
      recordPlacedOrder
    }),
    [
      user,
      sessionStatus,
      sessionError,
      location,
      locationLabel,
      pizza,
      loadedFavorite,
      radiusKm,
      ranking,
      comparisonOutcome,
      checkoutPizzeriaId,
      lastPlacedOrder,
      recentOrders,
      setUser,
      setLocation,
      loadFavorite,
      recordPlacedOrder
    ]
  )

  return (
    <AppSessionContext.Provider value={value}>
      {children}
    </AppSessionContext.Provider>
  )
}

export function useAppSession (): AppSessionValue {
  const value = useContext(AppSessionContext)
  if (value === null) {
    throw new Error('useAppSession must be used within AppSessionProvider')
  }
  return value
}
