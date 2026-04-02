const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'

export const nid = (size: number = 6): string => {
  let result = ''

  for (let i = 0; i < size; i += 1) {
    result += CHARS[Math.floor(Math.random() * CHARS.length)]
  }

  return result
}

export default nid
