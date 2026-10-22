import useLoungeData from './useLoungeData'
export default function useBookings() {
  const { bookings, error } = useLoungeData()
  return { bookings, error }
}
