export interface SessionRecord {
  readonly id: string
  readonly userId: string
  readonly tokenHash: string
  readonly createdAt: Date
  readonly expiresAt: Date
}

export interface SessionStore {
  create(session: SessionRecord): Promise<void>
  findByTokenHash(tokenHash: string): Promise<SessionRecord | null>
  deleteByTokenHash(tokenHash: string): Promise<void>
}
