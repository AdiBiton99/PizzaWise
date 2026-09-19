export interface ProfileRecord {
  readonly userId: string
  readonly displayName: string
  readonly phone: string
}

export interface ProfileStore {
  findByUserId(userId: string): Promise<ProfileRecord | null>
  upsert(profile: ProfileRecord): Promise<void>
}
