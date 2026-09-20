export async function mapWithConcurrency<T, R> (
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (!Number.isSafeInteger(concurrency) || concurrency <= 0) {
    throw new RangeError('Concurrency must be a positive safe integer')
  }

  if (items.length === 0) {
    return []
  }

  const results = new Array<R>(items.length)
  const errors: unknown[] = []
  let nextIndex = 0

  async function worker (): Promise<void> {
    while (true) {
      const index = nextIndex
      nextIndex += 1
      if (index >= items.length) {
        return
      }

      try {
        results[index] = await mapper(items[index] as T, index)
      } catch (error) {
        errors.push(error)
      }
    }
  }

  const workerCount = Math.min(concurrency, items.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  if (errors.length > 0) {
    throw errors[0]
  }

  return results
}
