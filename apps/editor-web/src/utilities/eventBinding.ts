const on = <
  T extends Window | HTMLElement,
  K extends keyof T extends Window ? keyof WindowEventMap : keyof HTMLElementEventMap
>(
  target: T,
  type: K,
  listener: (this: T, ev: Event) => unknown,
  options?: boolean | AddEventListenerOptions
) => {
  target.addEventListener(type, listener, options)
}

const off = <
  T extends Window | HTMLElement,
  K extends keyof T extends Window ? keyof WindowEventMap : keyof HTMLElementEventMap
>(
  target: T,
  type: K,
  listener: (this: T, ev: Event) => unknown,
  options?: boolean | AddEventListenerOptions
) => {
  target.removeEventListener(type, listener, options)
}

export {on, off}