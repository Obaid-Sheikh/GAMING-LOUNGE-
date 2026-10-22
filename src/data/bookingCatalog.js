// Demo fixtures, not business policy or confirmed lounge inventory.
export const DEMO_USER = { id: 'demo-customer', name: 'Demo Player', email: 'player@example.test' }
export const DEMO_TIME_ZONE = 'Asia/Kolkata'
export const OPEN_HOUR = 10
export const CLOSE_HOUR = 22
export const DURATIONS = [1, 2, 3]
export const BOOKING_WINDOW_DAYS = 30

export const stations = [
  { id: 'ps-01', zoneId: 'playstation', name: 'PlayStation 01', rate: 200, capacity: 1, games: ['fc', 'tekken'], active: true },
  { id: 'ps-02', zoneId: 'playstation', name: 'PlayStation 02', rate: 200, capacity: 1, games: ['tekken'], active: true },
  { id: 'xbox-01', zoneId: 'xbox', name: 'Xbox 01', rate: 180, capacity: 1, games: ['fc', 'forza'], active: true },
  { id: 'xbox-02', zoneId: 'xbox', name: 'Xbox 02', rate: 180, capacity: 1, games: ['forza'], active: true },
  { id: 'pc-01', zoneId: 'pc', name: 'PC 01', rate: 120, capacity: 1, games: ['valorant', 'forza'], active: true },
  { id: 'pc-02', zoneId: 'pc', name: 'PC 02', rate: 120, capacity: 1, games: ['valorant'], active: true },
  { id: 'ps-03', zoneId: 'playstation', name: 'PlayStation 03', rate: 200, capacity: 1, games: ['fc', 'tekken'], active: true },
  { id: 'ps-04', zoneId: 'playstation', name: 'PlayStation 04', rate: 200, capacity: 1, games: ['tekken'], active: true },
  { id: 'ps-05', zoneId: 'playstation', name: 'PlayStation 05', rate: 200, capacity: 1, games: ['fc'], active: true },
  { id: 'xbox-03', zoneId: 'xbox', name: 'Xbox 03', rate: 180, capacity: 1, games: ['forza'], active: true },
  { id: 'pc-03', zoneId: 'pc', name: 'PC 03', rate: 120, capacity: 1, games: ['valorant'], active: true },
  { id: 'pc-04', zoneId: 'pc', name: 'PC 04', rate: 120, capacity: 1, games: ['forza'], active: true },
  { id: 'room-02', zoneId: 'entertainment', name: 'Private entertainment room 02', rate: 350, capacity: 6, games: [], active: true, amenities: ['Group seating for up to 6', 'Shared display'] },
  { id: 'room-01', zoneId: 'entertainment', name: 'Private entertainment room', rate: 350, capacity: 6, games: [], active: true, amenities: ['Group seating for up to 6', 'Shared display', 'Netflix-style watch session'] },
]

export const money = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)

// Maintenance is separate from interval-derived reservation availability.
export const stationMaintenance = [{ stationId: 'pc-02', reason: 'Demo equipment servicing' }]

// Recurring demo reservations are expanded for the selected date, never written over customer records.
export const reservationFixtures = stations.filter((station) => station.active).flatMap((station) => [
  { stationId: station.id, hour: 12, duration: 1, status: 'confirmed', paymentStatus: station.id.endsWith('01') ? 'paid' : 'pending', foodIds: station.id === 'ps-01' ? ['fries', 'cold-coffee'] : [], foodOrderStatus: station.id === 'ps-01' ? 'pending' : undefined },
  ...(station.id.endsWith('02') ? [{ stationId: station.id, hour: 14, duration: 1, status: 'pending' }] : []),
])
