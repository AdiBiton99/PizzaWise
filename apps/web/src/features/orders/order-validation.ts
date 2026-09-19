export const MAX_DELIVERY_ADDRESS_LENGTH = 200

export function validateDeliveryAddress (address: string): string | null {
  const normalized = address.trim()
  if (normalized.length === 0) {
    return 'Delivery address must not be empty'
  }

  if (normalized.length > MAX_DELIVERY_ADDRESS_LENGTH) {
    return `Delivery address must not exceed ${MAX_DELIVERY_ADDRESS_LENGTH} characters`
  }

  return null
}
