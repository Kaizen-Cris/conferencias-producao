export function onlyDigits(value: string, maxLen = 9) {
  return value.replace(/\D/g, '').slice(0, maxLen)
}
