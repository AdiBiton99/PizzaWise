export const MAX_DELIVERY_ADDRESS_LENGTH = 200

export function validateDeliveryAddress (
  address: string
): 'validation.deliveryEmpty' | 'validation.deliveryLength' | null {
  const normalized = address.trim()
  if (normalized.length === 0) {
    return 'validation.deliveryEmpty'
  }

  if (normalized.length > MAX_DELIVERY_ADDRESS_LENGTH) {
    return 'validation.deliveryLength'
  }

  return null
}
