import { customType } from 'drizzle-orm/mysql-core'

const UUID_HEX_LENGTH = 32

export function uuidToBinary (uuid: string): Buffer {
  const hex = uuid.replaceAll('-', '').toLowerCase()
  if (hex.length !== UUID_HEX_LENGTH || !/^[0-9a-f]+$/.test(hex)) {
    throw new RangeError('UUID must be a 36-character hyphenated hex string')
  }

  return Buffer.from(hex, 'hex')
}

export function binaryToUuid (value: Buffer): string {
  if (value.length !== 16) {
    throw new RangeError('Binary UUID must be 16 bytes')
  }

  const hex = value.toString('hex')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join('-')
}

export const binaryUuid = customType<{ data: string, driverData: Buffer }>({
  dataType () {
    return 'binary(16)'
  },
  toDriver (value: string) {
    return uuidToBinary(value)
  },
  fromDriver (value: Buffer) {
    return binaryToUuid(Buffer.isBuffer(value) ? value : Buffer.from(value))
  }
})
