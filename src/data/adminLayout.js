// Sample layout only. Zone and station coordinates can be adjusted independently of inventory.
export const adminNavigation = [
  { path: '', label: 'Overview', icon: 'overview' },
  { path: 'floor', label: 'Lounge Floor', icon: 'floor' },
  ...[['stations', 'Stations & Zones'], ['bookings', 'Bookings'], ['games', 'Games Catalog'], ['food', 'Food & Beverages'], ['orders', 'Orders'], ['payments', 'Payments'], ['customers', 'Customers'], ['settings', 'Settings']].map(([path, label]) => ({ path, label, icon: 'grid', upcoming: true })),
]
export const floorZones = [
  { id: 'playstation', name: 'PlayStation Zone', gridArea: '1 / 1 / 2 / 2', columns: 3 },
  { id: 'xbox', name: 'Xbox Gaming Zone', gridArea: '1 / 3 / 2 / 4', columns: 3 },
  { id: 'pc', name: 'PC Gaming Zone', gridArea: '3 / 1 / 4 / 2', columns: 2 },
  { id: 'entertainment', name: 'Private Entertainment / Chill', gridArea: '3 / 3 / 4 / 4', columns: 2 },
]
export const stationPositions = {
  'ps-01': [1, 1], 'ps-02': [1, 2], 'ps-03': [1, 3], 'ps-04': [2, 1], 'ps-05': [2, 3],
  'xbox-01': [1, 1], 'xbox-02': [1, 2], 'xbox-03': [2, 3],
  'pc-01': [1, 1], 'pc-02': [1, 2], 'pc-03': [2, 1], 'pc-04': [2, 2],
  'room-01': [1, 1], 'room-02': [1, 2],
}
