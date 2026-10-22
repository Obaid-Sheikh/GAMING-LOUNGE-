export const AUTH_KEY = 'gaming-lounge:demo-auth:v1'
export const BOOKINGS_KEY = 'gaming-lounge:demo-bookings:v1'

export function readStored(key, fallback, validate) {
  let raw
  try {
    raw = localStorage.getItem(key)
  } catch {
    throw new Error('Browser storage is unavailable. Allow local storage to use this demo.')
  }
  if (raw === null) return fallback
  try {
    const value = JSON.parse(raw)
    if (!validate(value)) throw new Error('Invalid data')
    return value
  } catch {
    throw new Error('Saved demo data could not be read. The stored data has not been changed. Back it up before repairing it.')
  }
}

export function writeStored(key, value) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    throw new Error('Could not save demo data. Check browser storage permissions or available space, then try again.')
  }
}
