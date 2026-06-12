import { useEffect, useState } from 'react'

export function useOnlineStatus() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)

  useEffect(() => {
    const goOn = () => setOnline(true)
    const goOff = () => setOnline(false)
    window.addEventListener('online', goOn)
    window.addEventListener('offline', goOff)
    return () => {
      window.removeEventListener('online', goOn)
      window.removeEventListener('offline', goOff)
    }
  }, [])

  return online
}
