import { useState } from 'react'
import { I18N } from './i18n.js'
import { CTP, wxFrom } from './lib/weather.js'
import { nowIso } from './lib/format.js'
import { useLang } from './hooks/useLang.js'
import { useClock } from './hooks/useClock.js'
import { useWeather } from './hooks/useWeather.js'
import Phone from './components/Phone.jsx'

// place names (uppercased) for the active language
function placeFrom(names, lang, code) {
  if (!names) return { n1: '', n2: '', code: code || '' }
  const nm = names[lang] || names.ko || { n1: '', n2: '' }
  return { n1: (nm.n1 || '').toUpperCase(), n2: (nm.n2 || '').toUpperCase(), code: code || '' }
}

// derive a view from the color-test controls (works even before/without live data)
function buildTestView(base, test, lang) {
  const iso = (base && base.curTime) || nowIso()
  const offset = base ? base.offset : -new Date().getTimezoneOffset() * 60
  const sunrise = (base && base.sunrise) || iso.slice(0, 10) + 'T06:00'
  const sunset = (base && base.sunset) || iso.slice(0, 10) + 'T18:30'
  const place = base ? placeFrom(base.names, lang, base.code) : { n1: 'COLOR TEST', n2: '', code: '' }
  const wx = wxFrom(CTP[test.cond] || { sky: 0 })
  return {
    tempC: test.temp, wx, isDay: test.day ? 1 : 0,
    offset, curTime: iso, sunrise, sunset, place,
    wind: base ? base.wind : null, windDir: base ? base.windDir : null,
    hum: base ? base.hum : null, pop: base ? base.pop : null,
    wave: base ? base.wave : undefined, daily: base ? base.daily : [], marine: base ? base.marine : { kind: 'unavailable' },
    state: 'fresh', source: base ? base.source : 'test', airQuality: base ? base.airQuality : null,
  }
}

export default function App() {
  const { model, status, load } = useWeather()
  const [lang, setLang] = useLang()
  const nowMs = useClock()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [test, setTest] = useState({ on: false, cond: 'clear', day: true, temp: 20 })

  const dict = I18N[lang]

  // active view: color-test override, else live model, else null
  let view = null
  if (test.on) view = buildTestView(model, test, lang)
  else if (model) view = { ...model, place: placeFrom(model.names, lang, model.code) }

  return (
    <div className="app">
      <div className="pagehead">
        <h1>COLORSENSE</h1>
        <p dangerouslySetInnerHTML={{ __html: dict.pageDesc }} />
      </div>

      <Phone
        view={view}
        dict={dict}
        lang={lang}
        nowMs={nowMs}
        status={test.on ? 'ready' : status}
        sheetOpen={sheetOpen}
        onOpenSheet={() => setSheetOpen(true)}
        onCloseSheet={() => setSheetOpen(false)}
        settingsOpen={settingsOpen}
        onOpenSettings={() => setSettingsOpen(true)}
        onCloseSettings={() => setSettingsOpen(false)}
        test={test}
        onToggleTest={() => setTest((t) => ({ ...t, on: true }))}
        onTest={(patch) => setTest((t) => ({ ...t, ...patch }))}
        onReturnLive={() => { setTest((t) => ({ ...t, on: false })); setSettingsOpen(false); load() }}
        onSetLang={setLang}
        onRetry={load}
        onPickCity={() => alert(dict.pickSoon)}
      />

      <div className="hint" dangerouslySetInnerHTML={{ __html: dict.hint }} />
    </div>
  )
}
