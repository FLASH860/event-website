import { useEffect, useState } from 'react'
export default function useReducedMotion() {
  const q = '(prefers-reduced-motion: reduce)'
  const [r, setR] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q), h = () => setR(m.matches)
    m.addEventListener('change', h)
    return () => m.removeEventListener('change', h)
  }, [])
  return r
}
