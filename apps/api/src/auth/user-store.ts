export class DuplicateEmailError extends Error {
  constructor () {
    super('Email already exists')
    this.name = 'DuplicateEmailError'
  }
}

export interface UserRecord {
  readonly id: string
  readonly email: string
  readonly passwordHash: string
  readonly createdAt: Date
}

export interface UserStore {
  create(user: UserRecord): Promise<void>
  findByEmail(email: string): Promise<UserRecord | null>
  findById(id: string): Promise<UserRecord | null>
}
