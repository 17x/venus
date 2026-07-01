import {type ClassValue, clsx} from 'clsx'
import {twMerge} from 'tailwind-merge'

// Normalize className composition so all UI layers share one merge behavior.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
