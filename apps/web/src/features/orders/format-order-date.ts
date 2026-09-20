const ENGLISH_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
] as const

export function formatOrderPlacedAt (
  iso: string,
  locale: 'en' | 'he' = 'en'
): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }

  if (locale === 'he') {
    const formatted = new Intl.DateTimeFormat('he-IL', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).format(date)
    return `${formatted} UTC`
  }

  const day = date.getUTCDate()
  const month = ENGLISH_MONTHS[date.getUTCMonth()]
  const year = date.getUTCFullYear()
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')

  return `${day} ${month} ${year}, ${hours}:${minutes} UTC`
}
