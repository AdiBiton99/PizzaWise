import type {
  Menu,
  NearbyPizzeria,
  NearbyPizzeriaMenuResult
} from '@pizzawise/shared'
import { mapWithConcurrency } from './map-with-concurrency.js'

export const DEFAULT_MENU_FETCH_CONCURRENCY = 4

export interface MenuReader {
  getMenu(pizzeriaId: string): Promise<Menu>
}

export interface FetchNearbyPizzeriaMenusOptions {
  readonly concurrency?: number
}

export async function fetchNearbyPizzeriaMenus (
  nearby: readonly NearbyPizzeria[],
  menuReader: MenuReader,
  options: FetchNearbyPizzeriaMenusOptions = {}
): Promise<NearbyPizzeriaMenuResult[]> {
  const concurrency = options.concurrency ?? DEFAULT_MENU_FETCH_CONCURRENCY

  return await mapWithConcurrency(
    nearby,
    concurrency,
    async (item): Promise<NearbyPizzeriaMenuResult> => {
      try {
        return {
          nearby: item,
          status: 'available',
          menu: await menuReader.getMenu(item.pizzeria.id)
        }
      } catch {
        return {
          nearby: item,
          status: 'unavailable'
        }
      }
    }
  )
}
