/**
 * Defines a disposable resource contract.
 */
export interface Disposable {
  /** Releases held resources and listeners. */
  dispose(): void
}

/**
 * Collects disposable resources and disposes them in reverse registration order.
 */
export class DisposableStore implements Disposable {
  private readonly disposables = new Set<Disposable>()
  private disposed = false

  /**
   * Adds a disposable resource to the store and returns the same resource.
   */
  add<TDisposable extends Disposable>(disposable: TDisposable): TDisposable {
    // Dispose immediately when the store is already disposed to avoid leaks.
    if (this.disposed) {
      disposable.dispose()
      return disposable
    }

    this.disposables.add(disposable)
    return disposable
  }

  /**
   * Disposes all currently tracked resources and keeps the store reusable.
   */
  clear(): void {
    for (const disposable of [...this.disposables].reverse()) {
      disposable.dispose()
    }
    this.disposables.clear()
  }

  /**
   * Permanently disposes the store and prevents future accumulation.
   */
  dispose(): void {
    if (this.disposed) {
      return
    }

    this.disposed = true
    this.clear()
  }
}

