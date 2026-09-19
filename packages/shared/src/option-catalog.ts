import type { DesiredOptionTag } from './domain.js'

type ProviderTagMapping = readonly [string, DesiredOptionTag]

export const SIZE_PROVIDER_MAPPINGS: readonly ProviderTagMapping[] = [
  ['Small', 'small'],
  ['S', 'small'],
  ['Personal', 'small'],
  ['Single', 'small'],
  ['Piccola', 'small'],
  ['Medium', 'medium'],
  ['M', 'medium'],
  ['Regular', 'medium'],
  ['Large', 'large'],
  ['L', 'large'],
  ['Grande', 'large'],
  ['Big', 'large'],
  ['XL', 'extra-large'],
  ['Family', 'extra-large'],
  ['Tray', 'extra-large']
]

export const CRUST_PROVIDER_MAPPINGS: readonly ProviderTagMapping[] = [
  ['Cheese Burst', 'cheese-burst'],
  ['Classic', 'classic'],
  ['Deep Dish', 'deep-dish'],
  ['Gluten Free', 'gluten-free'],
  ['Homestyle', 'homestyle'],
  ['Neapolitan', 'neapolitan'],
  ['Pan', 'pan'],
  ['Sourdough', 'sourdough'],
  ['Stuffed', 'stuffed'],
  ['Thin', 'thin'],
  ['Thin & Crispy', 'thin-crispy'],
  ['Whole Wheat', 'whole-wheat'],
  ['Wood Fired', 'wood-fired']
]

export const SAUCE_PROVIDER_MAPPINGS: readonly ProviderTagMapping[] = [
  ['bbq', 'bbq'],
  ['garlic cream', 'garlic-cream'],
  ['harissa', 'harissa'],
  ['pesto', 'pesto'],
  ['san marzano', 'san-marzano'],
  ['tomato', 'tomato'],
  ['white', 'white']
]

export const TOPPING_PROVIDER_MAPPINGS: readonly ProviderTagMapping[] = [
  ['anchovy', 'anchovy'],
  ['artichoke', 'artichoke'],
  ['arugula', 'arugula'],
  ['basil', 'basil'],
  ['bell pepper', 'bell-pepper'],
  ['black olives', 'black-olives'],
  ['buffalo mozzarella', 'buffalo-mozzarella'],
  ['bulgarian cheese', 'bulgarian-cheese'],
  ['caramelized onion', 'caramelized-onion'],
  ['champignon', 'champignon'],
  ['cherry tomato', 'cherry-tomato'],
  ['corn', 'corn'],
  ['Double Cheese', 'double-cheese'],
  ['egg', 'egg'],
  ['extra cheese', 'extra-cheese'],
  ['extra_cheese', 'extra-cheese'],
  ['feta', 'feta'],
  ['funghi', 'funghi'],
  ['green olives', 'green-olives'],
  ['Olives (green)', 'green-olives'],
  ['hot pepper', 'hot-pepper'],
  ['jalapeño', 'jalapeno'],
  ['labneh', 'labneh'],
  ['mushroom', 'mushroom'],
  ['MUSHROOMS', 'mushroom'],
  ['Olives', 'olives'],
  ['onion', 'onion'],
  ['onions', 'onion'],
  ['oregano', 'oregano'],
  ['pepperoni', 'pepperoni'],
  ['pesto drizzle', 'pesto-drizzle'],
  ['pineapple', 'pineapple'],
  ['porcini mushroom', 'porcini-mushroom'],
  ['prosciutto', 'prosciutto'],
  ['red onion', 'red-onion'],
  ['smoked mozzarella', 'smoked-mozzarella'],
  ['sun-dried tomato', 'sun-dried-tomato'],
  ['sweet corn', 'sweet-corn'],
  ['truffle oil', 'truffle-oil'],
  ['TUNA', 'tuna'],
  ["za'atar", 'zaatar']
]

export const PIZZA_SIZE_TAGS = uniqueTags(SIZE_PROVIDER_MAPPINGS)
export const PIZZA_CRUST_TAGS = uniqueTags(CRUST_PROVIDER_MAPPINGS)
export const PIZZA_SAUCE_TAGS = uniqueTags(SAUCE_PROVIDER_MAPPINGS)
export const PIZZA_TOPPING_TAGS = uniqueTags(TOPPING_PROVIDER_MAPPINGS)

export const SIZE_TAG_VALUES: ReadonlySet<DesiredOptionTag> = new Set(PIZZA_SIZE_TAGS)
export const CRUST_TAG_VALUES: ReadonlySet<DesiredOptionTag> = new Set(PIZZA_CRUST_TAGS)
export const SAUCE_TAG_VALUES: ReadonlySet<DesiredOptionTag> = new Set(PIZZA_SAUCE_TAGS)
export const TOPPING_TAG_VALUES: ReadonlySet<DesiredOptionTag> = new Set(PIZZA_TOPPING_TAGS)

const LABEL_OVERRIDES: Readonly<Record<string, string>> = {
  bbq: 'BBQ',
  jalapeno: 'Jalapeno',
  'thin-crispy': 'Thin & crispy',
  zaatar: "Za'atar"
}

export function pizzaOptionLabel (tag: DesiredOptionTag): string {
  const override = LABEL_OVERRIDES[tag]
  if (override !== undefined) {
    return override
  }

  return tag
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function uniqueTags (
  mappings: readonly ProviderTagMapping[]
): readonly DesiredOptionTag[] {
  const tags: DesiredOptionTag[] = []
  const seen = new Set<DesiredOptionTag>()

  for (const [, tag] of mappings) {
    if (!seen.has(tag)) {
      seen.add(tag)
      tags.push(tag)
    }
  }

  return tags
}
