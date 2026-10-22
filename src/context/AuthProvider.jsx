import { useEffect, useState } from 'react'
import { AuthContext } from './authContext'
import { AUTH_KEY, readStored, writeStored } from '../lib/demoStorage'
import { DEMO_USER } from '../data/bookingCatalog'

function readSession() {
  try {
    const session = readStored(AUTH_KEY, null, (value) => value?.id === DEMO_USER.id)
    return { user: session ? DEMO_USER : null, error: '' }
  } catch (error) {
    return { user: null, error: error.message }
  }
}

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession)
  useEffect(() => {
    const sync = (event) => {
      if (event.key === AUTH_KEY || event.key === null) setSession(readSession())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  function login() {
    try {
      writeStored(AUTH_KEY, { id: DEMO_USER.id })
      setSession({ user: DEMO_USER, error: '' })
      return true
    } catch (error) {
      setSession({ user: null, error: error.message })
      return false
    }
  }

  function logout() {
    try {
      writeStored(AUTH_KEY, null)
      setSession({ user: null, error: '' })
    } catch (error) {
      setSession((previous) => ({ ...previous, error: error.message }))
    }
  }

  return <AuthContext.Provider value={{ ...session, login, logout }}>{children}</AuthContext.Provider>
}
