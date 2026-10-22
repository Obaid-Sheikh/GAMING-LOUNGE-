import { stations as defaultStations, stationMaintenance } from '../data/bookingCatalog.js'
import { zones as defaultZones, games } from '../data/catalog.js'
import { floorZones, stationPositions } from '../data/adminLayout.js'

export const supportedGames = {
  playstation: ['fc', 'tekken'], xbox: ['fc', 'forza'], pc: ['valorant', 'forza', 'tekken'], entertainment: [],
}
export const equipmentTypes = ['PlayStation console', 'Xbox console', 'Gaming PC', 'Private screening room']
export const defaultEquipment = (zoneId) => equipmentTypes[['playstation', 'xbox', 'pc', 'entertainment'].indexOf(zoneId)]
export const text = (value, max = 120) => typeof value === 'string' && value.trim().length > 0 && value.length <= max
export const finiteMoney = (value) => Number.isFinite(value) && value >= 0 && value <= 100000000 && Math.abs(value * 100 - Math.round(value * 100)) < 0.00001
export const unique = (items) => new Set(items).size === items.length

export function defaultInventory() {
  return {
    zones: defaultZones.map((zone, index) => ({ ...zone, active: true, archived: false, order: index, ...floorZones.find((item) => item.id === zone.id), name: zone.name })),
    stations: defaultStations.map((station) => ({ ...station, games: [...station.games], amenities: [...(station.amenities ?? [])], equipment: defaultEquipment(station.zoneId), archived: false, position: [...stationPositions[station.id]] })),
    maintenance: stationMaintenance.map((item) => ({ ...item, id: `seed-${item.stationId}`, startedAt: 0 })),
  }
}

export function validateStation(station, inventory) {
  if (!station || !/^[a-z0-9][a-z0-9-]{1,39}$/.test(station.id)) throw new Error('Use a unique station ID with 2-40 lowercase letters, numbers, or hyphens.')
  if (!text(station.name, 100)) throw new Error('Enter a station name (up to 100 characters).')
  if (!inventory.zones.some((zone) => zone.id === station.zoneId)) throw new Error('Choose a known zone.')
  if (!text(station.equipment, 100)) throw new Error('Enter the equipment type.')
  if (!finiteMoney(station.rate) || station.rate > 1000000) throw new Error('Enter a valid hourly price between 0 and 1,000,000 INR with at most two decimals.')
  if (!Number.isInteger(station.capacity) || station.capacity < 1 || station.capacity > 50) throw new Error('Capacity must be a whole number from 1 to 50.')
  if (!Array.isArray(station.games) || !unique(station.games) || station.games.some((id) => !games.some((game) => game.id === id) || !supportedGames[station.zoneId]?.includes(id))) throw new Error('Choose only games supported by this zone.')
  if (!Array.isArray(station.amenities) || station.amenities.length > 15 || station.amenities.some((name) => !text(name, 100))) throw new Error('Use up to 15 amenities of at most 100 characters each.')
  if (typeof station.active !== 'boolean' || typeof station.archived !== 'boolean') throw new Error('Invalid station operational state.')
  if (!Array.isArray(station.position) || station.position.length !== 2 || station.position[1] > inventory.zones.find((zone) => zone.id === station.zoneId).columns || !station.position.every((n) => Number.isInteger(n) && n >= 1 && n <= 100)) throw new Error('Invalid floor position.')
}

export function validateInventory(inventory) {
  if (!inventory || !Array.isArray(inventory.zones) || !Array.isArray(inventory.stations) || !Array.isArray(inventory.maintenance)) throw new Error('Invalid inventory schema.')
  const initial = defaultZones.map((zone) => zone.id)
  if (inventory.zones.length !== initial.length || !unique(inventory.zones.map((zone) => zone.id))) throw new Error('Preserve the four stable zone IDs.')
  for (const zone of inventory.zones) {
    if (!initial.includes(zone.id) || !text(zone.name, 100) || typeof zone.description !== 'string' || zone.description.length > 1000 || typeof zone.active !== 'boolean' || typeof zone.archived !== 'boolean' || !Number.isInteger(zone.order) || zone.order < 0 || zone.order > 99 || !Number.isInteger(zone.columns) || zone.columns < 1 || zone.columns > 6) throw new Error('Invalid zone configuration.')
  }
  if (!defaultStations.every((seed) => inventory.stations.some((station) => station.id === seed.id))) throw new Error('Default stations must be retained, using archiving rather than deletion.')
  if (!unique(inventory.stations.map((station) => station.id))) throw new Error('Duplicate station IDs.')
  for (const station of inventory.stations) validateStation(station, inventory)
  for (const zone of inventory.zones) {
    const positions = inventory.stations.filter((station) => station.zoneId === zone.id && !station.archived).map((station) => station.position.join(','))
    if (!unique(positions)) throw new Error('Floor positions must be unoccupied within their zone.')
  }
  const openMaintenance = []
  for (const item of inventory.maintenance) {
    if (!item || !text(item.id) || !inventory.stations.some((station) => station.id === item.stationId) || !text(item.reason, 500) || !Number.isFinite(item.startedAt) || (item.endedAt !== undefined && (!Number.isFinite(item.endedAt) || item.endedAt < item.startedAt))) throw new Error('Invalid maintenance history.')
    if (item.endedAt === undefined) openMaintenance.push(item.stationId)
  }
  if (!unique(openMaintenance)) throw new Error('Duplicate open maintenance records.')
  return true
}

export const currentMaintenance = (inventory, stationId) => inventory.maintenance.find((item) => item.stationId === stationId && item.endedAt === undefined)
export const orderedZones = (inventory) => [...inventory.zones].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
export function nextPosition(inventory, zoneId, ignoreId) {
  const zone = inventory.zones.find((item) => item.id === zoneId)
  const used = new Set(inventory.stations.filter((station) => station.zoneId === zoneId && !station.archived && station.id !== ignoreId).map((station) => station.position.join(',')))
  for (let row = 1; row <= 100; row++) for (let col = 1; col <= zone.columns; col++) if (!used.has(`${row},${col}`)) return [row, col]
  throw new Error('This sample zone has reached its position limit.')
}
