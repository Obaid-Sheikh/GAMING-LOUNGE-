import { useEffect, useState } from 'react'
import { readBookings } from '../lib/bookingStore'
import { BOOKINGS_KEY } from '../lib/demoStorage'

function snapshot() {
  try { return { bookings: readBookings(), error: '' } }
  catch (error) { return { bookings: [], error: error.message } }
}

export default function useBookings() {
  const [state, setState] = useState(snapshot)
  useEffect(() => {
    const sync = (event) => {
      if (event.type !== 'storage' || event.key === BOOKINGS_KEY || event.key === null) setState(snapshot())
    }
    window.addEventListener('storage', sync)
    window.addEventListener('demo-bookings-changed', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('demo-bookings-changed', sync)
    }
  }, [])
  return state
}
