import { useEffect, useState } from 'react'
import { defaultMenu, defaultSettings } from '../lib/commerceSchema'
import { defaultInventory } from '../lib/inventory'
import { readRepository, REPOSITORY_EVENT, isRepositoryStorageEvent } from '../lib/mockRepository'
function snapshot() {
  try { return { ...readRepository(), error: '' } }
  catch (error) { return { inventory: defaultInventory(), menu: defaultMenu(), settings: defaultSettings(), orders: [], transactions: [], bookings: [], activity: [], error: error.message } }
}
export default function useLoungeData() {
  const [state, setState] = useState(snapshot)
  useEffect(() => {
    const sync = (event) => { if (isRepositoryStorageEvent(event)) setState(snapshot()) }
    window.addEventListener('storage', sync)
    window.addEventListener(REPOSITORY_EVENT, sync)
    return () => { window.removeEventListener('storage', sync); window.removeEventListener(REPOSITORY_EVENT, sync) }
  }, [])
  return state
}
