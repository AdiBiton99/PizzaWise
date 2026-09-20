import type { NearbyPizzeriaMenuResult } from '@pizzawise/shared'
import {
  defaultUpstreamSleep,
  type UpstreamSleep
} from '../../integrations/upstream-retry.js'
import type { MenuReader } from './fetch-nearby-menus.js'

export const DEFAULT_MENU_RECOVERY_COOLDOWN_MS = 5_000

export interface RecoverFailedNearbyMenusOptions {
  readonly cooldownMs?: number
  readonly sleep?: UpstreamSleep
}

export interface RecoveredNearbyMenus {
  readonly menus: NearbyPizzeriaMenuResult[]
  readonly firstPassCheckedCount: number
  readonly recoveredCount: number
}

export async function recoverFailedNearbyPizzeriaMenus (
  results: readonly NearbyPizzeriaMenuResult[],
  menuReader: MenuReader,
  options: RecoverFailedNearbyMenusOptions = {}
): Promise<RecoveredNearbyMenus> {
  const firstPassCheckedCount = results.filter(
    (result) => result.status === 'available'
  ).length
  const failedIndexes: number[] = []

  for (const [index, result] of results.entries()) {
    if (result.status === 'unavailable') {
      failedIndexes.push(index)
    }
  }

  if (failedIndexes.length === 0) {
    return {
      menus: [...results],
      firstPassCheckedCount,
      recoveredCount: 0
    }
  }

  const cooldownMs = options.cooldownMs ?? DEFAULT_MENU_RECOVERY_COOLDOWN_MS
  const sleep = options.sleep ?? defaultUpstreamSleep

  if (!Number.isSafeInteger(cooldownMs) || cooldownMs < 0) {
    throw new RangeError('Recovery cooldown must be a non-negative safe integer')
  }

  await sleep(cooldownMs)

  const menus = [...results]
  let recoveredCount = 0

  for (const index of failedIndexes) {
    const failed = results[index]
    if (failed === undefined || failed.status !== 'unavailable') {
      continue
    }

    try {
      menus[index] = {
        nearby: failed.nearby,
        status: 'available',
        menu: await menuReader.getMenu(failed.nearby.pizzeria.id)
      }
      recoveredCount += 1
    } catch {
      menus[index] = failed
    }
  }

  return {
    menus,
    firstPassCheckedCount,
    recoveredCount
  }
}
