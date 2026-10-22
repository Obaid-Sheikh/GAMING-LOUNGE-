import { REPOSITORY_EVENT } from '../lib/mockRepository'
import { useEffect, useState } from 'react'

export default function useNow() {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const update = () => setNow(Date.now())
    const timer = window.setInterval(update, 30000)
    window.addEventListener(REPOSITORY_EVENT, update)
    window.addEventListener('storage', update)
    return () => { window.clearInterval(timer); window.removeEventListener(REPOSITORY_EVENT, update); window.removeEventListener('storage', update) }
  }, [])
  return now
}
