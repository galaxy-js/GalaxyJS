export function camelize (string) {
  return string.replace(/-([a-z])/, (_, letter) => letter.toUpperCase())
}
