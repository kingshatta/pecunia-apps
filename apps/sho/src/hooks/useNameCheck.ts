import { useEffect, useState } from 'react'

/**
 * Debounced check of whether a name is already in use by someone actively
 * using a machine. `check` should be stable (wrap it in useCallback).
 */
export function useNameCheck(
  name: string,
  check: (name: string) => Promise<boolean>,
): { taken: boolean; checking: boolean } {
  const [taken, setTaken] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    const n = name.trim()
    if (n.length < 2) {
      setTaken(false)
      setChecking(false)
      return
    }
    setChecking(true)
    let cancelled = false
    const t = setTimeout(() => {
      check(n)
        .then((r) => {
          if (!cancelled) setTaken(r)
        })
        .catch(() => {
          if (!cancelled) setTaken(false)
        })
        .finally(() => {
          if (!cancelled) setChecking(false)
        })
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [name, check])

  return { taken, checking }
}
