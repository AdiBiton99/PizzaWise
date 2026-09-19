import type {
  Menu,
  PricedProviderOption,
  Sauce,
  SemanticTag
} from '@pizzawise/shared'
import {
  CRUST_TAGS,
  SAUCE_TAGS,
  SIZE_TAGS,
  TOPPING_TAGS
} from './option-mappings.js'

function findTag (
  mappings: ReadonlyMap<string, string>,
  providerName: string
): SemanticTag {
  return mappings.get(providerName) ?? null
}

function normalizePricedOption (
  option: PricedProviderOption,
  mappings: ReadonlyMap<string, string>
): PricedProviderOption {
  return {
    ...option,
    semanticTag: findTag(mappings, option.providerName)
  }
}

function normalizeSauce (sauce: Sauce): Sauce {
  return {
    ...sauce,
    semanticTag: findTag(SAUCE_TAGS, sauce.providerName)
  }
}

export function normalizeMenuSemanticTags (menu: Menu): Menu {
  return {
    ...menu,
    sizes: menu.sizes.map((option) =>
      normalizePricedOption(option, SIZE_TAGS)
    ),
    crusts: menu.crusts.map((option) =>
      normalizePricedOption(option, CRUST_TAGS)
    ),
    sauces: menu.sauces.map(normalizeSauce),
    toppings: menu.toppings.map((option) =>
      normalizePricedOption(option, TOPPING_TAGS)
    )
  }
}
