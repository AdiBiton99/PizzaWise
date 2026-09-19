import {
  PIZZA_CRUST_TAGS,
  PIZZA_SAUCE_TAGS,
  PIZZA_SIZE_TAGS,
  PIZZA_TOPPING_TAGS,
  pizzaOptionLabel,
  type DesiredOptionTag
} from '@pizzawise/shared'

export interface PizzaOptionChoice {
  readonly tag: DesiredOptionTag
  readonly label: string
}

export const SIZE_OPTIONS = toChoices(PIZZA_SIZE_TAGS)
export const CRUST_OPTIONS = toChoices(PIZZA_CRUST_TAGS)
export const SAUCE_OPTIONS = toChoices(PIZZA_SAUCE_TAGS)
export const TOPPING_OPTIONS = toChoices(PIZZA_TOPPING_TAGS)

function toChoices (
  tags: readonly DesiredOptionTag[]
): readonly PizzaOptionChoice[] {
  return tags.map((tag) => ({
    tag,
    label: pizzaOptionLabel(tag)
  }))
}
