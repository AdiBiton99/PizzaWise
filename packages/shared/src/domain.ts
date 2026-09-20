/**
 * A currency identifier such as an ISO 4217 code.
 *
 * This remains data-driven because currencies come from menu data rather than
 * from a closed list in the application.
 */
export type CurrencyCode = string

/**
 * PizzaWise's interpretation of a provider label.
 *
 * A null tag means that PizzaWise cannot confidently map the provider value to
 * a known semantic concept. The original provider value is always retained.
 */
export type SemanticTag = string | null

/**
 * A provider-independent semantic option selected by a PizzaWise user.
 */
export type DesiredOptionTag = NonNullable<SemanticTag>

/**
 * Money represented in integer minor units to avoid floating-point errors.
 */
export interface Money {
  readonly amountMinor: number
  readonly currency: CurrencyCode
}

/**
 * A normalized ETA.
 *
 * `minMinutes` and `maxMinutes` are the original bounds for display.
 * `minutes` is the ranking value: a point estimate, or the midpoint of a range.
 */
export interface EtaRange {
  readonly minMinutes: number
  readonly maxMinutes: number
  readonly minutes: number
}

export function createEtaRange (
  minMinutes: number,
  maxMinutes = minMinutes
): EtaRange {
  return {
    minMinutes,
    maxMinutes,
    minutes: (minMinutes + maxMinutes) / 2
  }
}

/**
 * A provider-independent geographic position selected by the user.
 */
export interface UserLocation {
  readonly latitude: number
  readonly longitude: number
}

/**
 * A provider-independent candidate returned by manual location search.
 */
export interface LocationSearchResult {
  readonly label: string
  readonly location: UserLocation
}

/**
 * A pizzeria returned by the external directory.
 */
export interface Pizzeria {
  readonly id: string
  readonly name: string
  readonly latitude: number
  readonly longitude: number
  readonly averageEta: EtaRange | null
}

/**
 * A canonical pizzeria with distance calculated for one user location.
 */
export interface NearbyPizzeria {
  readonly pizzeria: Pizzeria
  readonly distanceKm: number
}

/**
 * Common provider data retained for priced menu options.
 *
 * Provider IDs are opaque and only meaningful within their pizzeria and option
 * category.
 */
export interface PricedProviderOption {
  readonly providerId: string
  readonly providerName: string
  readonly semanticTag: SemanticTag
  readonly price: Money
}

export type PizzaSize = PricedProviderOption

export type Crust = PricedProviderOption

/**
 * Sauces are plain provider strings in the currently observed API.
 */
export interface Sauce {
  readonly providerName: string
  readonly semanticTag: SemanticTag
}

export type Topping = PricedProviderOption

/**
 * A provider-independent menu. Its pizzeria ID scopes all contained provider
 * option IDs and preserves the menu's origin.
 */
export interface Menu {
  readonly pizzeriaId: string
  readonly currency: CurrencyCode
  readonly sizes: readonly PizzaSize[]
  readonly crusts: readonly Crust[]
  readonly sauces: readonly Sauce[]
  readonly toppings: readonly Topping[]
}

/**
 * A nearby pizzeria together with the outcome of fetching its canonical menu.
 *
 * A failed fetch is represented as unavailable rather than as an empty menu.
 */
export type NearbyPizzeriaMenuResult =
  | {
      readonly nearby: NearbyPizzeria
      readonly status: 'available'
      readonly menu: Menu
    }
  | {
      readonly nearby: NearbyPizzeria
      readonly status: 'unavailable'
    }

/**
 * A user's desired pizza, expressed without provider-local identifiers.
 */
export interface PizzaConfiguration {
  readonly sizeTag: DesiredOptionTag
  readonly crustTag: DesiredOptionTag
  readonly sauceTag: DesiredOptionTag
  readonly toppingTags: readonly DesiredOptionTag[]
}

/**
 * A saved pizza configuration owned by one user, independent of any pizzeria.
 */
export interface FavoritePizza {
  readonly id: string
  readonly name: string
  readonly configuration: PizzaConfiguration
}

/**
 * The exact canonical provider options selected for one matched pizza.
 */
export interface MatchedPizzaSelection {
  readonly size: PizzaSize
  readonly crust: Crust
  readonly sauce: Sauce
  readonly toppings: readonly Topping[]
}

/**
 * A nearby pizzeria whose canonical menu fully matched the requested pizza.
 */
export interface MatchedNearbyPizza {
  readonly nearby: NearbyPizzeria
  readonly selection: MatchedPizzaSelection
  readonly total: Money
}

/**
 * The criterion a user may boost when ranking matched pizzas.
 *
 * Omitting a priority uses the default balanced weights.
 */
export type ComparisonPriority = 'price' | 'distance' | 'eta'

/**
 * Normalized 0–1 costs for one ranked pizza. Lower is better.
 */
export interface ComparisonCosts {
  readonly price: number
  readonly distance: number
  readonly eta: number
}

/**
 * One matched pizza after comparison ranking.
 */
export interface RankedPizza {
  readonly rank: number
  readonly score: number
  readonly costs: ComparisonCosts
  readonly nearby: NearbyPizzeria
  readonly selection: MatchedPizzaSelection
  readonly total: Money
}

/**
 * Temporary debug counts for a comparison request.
 */
export interface ComparisonDebugStats {
  readonly consideredPizzeriaCount: number
  readonly checkedPizzeriaCount: number
  readonly recoveredPizzeriaCount: number
  readonly uncheckedPizzeriaCount: number
  readonly matchedPizzeriaCount: number
}

/**
 * Ranked matched pizzas for one comparison request.
 */
export interface PizzaComparison {
  readonly ranked: readonly RankedPizza[]
  readonly uncheckedPizzeriaCount: number
  readonly debug?: ComparisonDebugStats
}

/**
 * Safe public fields for an authenticated PizzaWise user.
 */
export interface PublicUser {
  readonly id: string
  readonly email: string
  readonly createdAt: string
}

/**
 * Authenticated user's profile fields. Delivery address is not stored here.
 */
export interface UserProfile {
  readonly userId: string
  readonly displayName: string
  readonly phone: string
}

/**
 * How an order is fulfilled. Stored as a string so later types can be added.
 */
export type FulfillmentType = 'delivery' | 'pickup'

/**
 * Lifecycle status of a locally recorded order.
 */
export type OrderStatus = 'placed'

/**
 * A locally recorded order snapshot. Prices and pizzeria details come from
 * the live Pizzeria API, never from the client.
 */
export interface Order {
  readonly id: string
  readonly pizzeriaId: string
  readonly pizzeriaName: string
  readonly configuration: PizzaConfiguration
  readonly total: Money
  readonly phone: string
  readonly fulfillmentType: FulfillmentType
  readonly deliveryAddress: string | null
  readonly status: OrderStatus
  readonly createdAt: string
}
