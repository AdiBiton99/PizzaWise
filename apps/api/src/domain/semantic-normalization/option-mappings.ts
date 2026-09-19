import {
  CRUST_PROVIDER_MAPPINGS,
  CRUST_TAG_VALUES,
  SAUCE_PROVIDER_MAPPINGS,
  SAUCE_TAG_VALUES,
  SIZE_PROVIDER_MAPPINGS,
  SIZE_TAG_VALUES,
  TOPPING_PROVIDER_MAPPINGS,
  TOPPING_TAG_VALUES,
  type DesiredOptionTag
} from '@pizzawise/shared'

type OptionMapping = ReadonlyMap<string, DesiredOptionTag>

export const SIZE_TAGS: OptionMapping = new Map(SIZE_PROVIDER_MAPPINGS)
export const CRUST_TAGS: OptionMapping = new Map(CRUST_PROVIDER_MAPPINGS)
export const SAUCE_TAGS: OptionMapping = new Map(SAUCE_PROVIDER_MAPPINGS)
export const TOPPING_TAGS: OptionMapping = new Map(TOPPING_PROVIDER_MAPPINGS)

export {
  CRUST_TAG_VALUES,
  SAUCE_TAG_VALUES,
  SIZE_TAG_VALUES,
  TOPPING_TAG_VALUES
}
