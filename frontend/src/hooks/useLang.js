import { useCallback, useState } from 'react'

// Language state persisted to localStorage (safe against private-mode throws).
export function useLang() {
  const [lang, set] = useState(() => {
    try { const s = localStorage.getItem('cs_lang'); return s === 'ko' || s === 'en' ? s : 'ko' } catch (e) { return 'ko' }
  })
  const setLang = useCallback((l) => {
    try { localStorage.setItem('cs_lang', l) } catch (e) { /* ignore */ }
    try { document.documentElement.lang = l } catch (e) { /* ignore */ }
    set(l)
  }, [])
  return [lang, setLang]
}
