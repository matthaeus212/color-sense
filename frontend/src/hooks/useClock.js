import { useEffect, useState } from 'react'

// A ticking wall clock (updates every 15s) so the time + sun position stay live.
export function useClock(intervalMs = 15000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
