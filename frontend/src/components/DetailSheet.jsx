import { interp, BOT, rgb } from '../lib/color.js'
import { compassIndex } from '../lib/weather.js'
import { wIcon } from '../lib/icons.js'
import { fmtT, WD, WDKO, formatTime } from '../lib/format.js'

function Tile({ label, children }) {
  return (
    <div className="tile">
      <div className="tl">{label}</div>
      <div className="tv">{children}</div>
    </div>
  )
}

// Swipe-up sheet: wind / humidity / rain chance / waves + 7-day forecast.
export default function DetailSheet({ open, view, dict, lang, onClose }) {
  const v = view || {}
  const wind = v.wind == null ? '—' : <>{Math.round(v.wind)} <small>m/s {v.windDir != null ? dict.compass[compassIndex(v.windDir)] : ''}</small></>
  const hum = v.hum == null ? '—' : <>{Math.round(v.hum)}<small>%</small></>
  const pop = v.pop == null ? '—' : <>{Math.round(v.pop)}<small>%</small></>
  const mk = v.marine ? v.marine.kind : 'unavailable'
  const wave = mk === 'unavailable' ? <small>—</small> : mk === 'loading' ? <small>{dict.waveLoading}</small> : <>{Number(v.wave).toFixed(1)} <small>m</small></>
  const aq = v.airQuality
  const aqNote = aq && aq.kind === 'forecast' ? ` · ${dict.aqForecast}` : ''
  const hourly = v.hourly || []

  const daily = v.daily || []
  let lo = 0, hi = 1, span = 1
  if (daily.length) { lo = Math.min(...daily.map((d) => d.lo)); hi = Math.max(...daily.map((d) => d.hi)); span = Math.max(1, hi - lo) }

  return (
    <div className={'sheet' + (open ? ' open' : '')}>
      <div className="shandle" onClick={onClose} />
      <div className="stitle">{dict.sheetInfo}</div>
      <div className="metrics">
        <Tile label={dict.wind}>{wind}</Tile>
        <Tile label={dict.hum}>{hum}</Tile>
        <Tile label={dict.pop}>{pop}</Tile>
        <Tile label={dict.wave}>{wave}</Tile>
      </div>
      {hourly.length > 0 && (
        <div className="hlist">
          {hourly.slice(0, 24).map((h, i) => (
            <div className="hcol" key={i}>
              <span className="ht">{h.time.slice(11, 13)}</span>
              <span className="hi" dangerouslySetInnerHTML={{ __html: wIcon(catOfSafe(h.wx)) }} />
              <span className="hv">{fmtT(h.tempC)}°</span>
              <span className="hp">{h.pop != null ? h.pop + '%' : ''}</span>
            </div>
          ))}
        </div>
      )}
      <div className="stitle">{dict.sheetWeek}</div>
      <div className="dlist">
        {daily.map((d, i) => {
          const [y, m, da] = d.date.split('-').map(Number)
          const dow = new Date(y, m - 1, da).getDay()
          const wd = i === 0 ? dict.today : lang === 'ko' ? WDKO[dow] : WD[dow]
          const left = ((d.lo - lo) / span) * 100
          const width = ((d.hi - d.lo) / span) * 100
          const grad = `linear-gradient(90deg, ${rgb(interp(BOT, d.lo))}, ${rgb(interp(BOT, d.hi))})`
          return (
            <div className="drow" key={i}>
              <span className="dw">{wd}</span>
              <span className="di" dangerouslySetInnerHTML={{ __html: wIcon(d.cat) }} />
              <span className="dlo">{fmtT(d.lo)}°</span>
              <span className="track"><span className="fill" style={{ left: left + '%', width: Math.max(width, 6) + '%', background: grad }} /></span>
              <span className="dhi">{fmtT(d.hi)}°</span>
            </div>
          )
        })}
      </div>
      <div className="attrib">
        {v.updatedAt ? `${dict.updated} ${formatTime(Date.parse(v.updatedAt), v.offset || 0, lang)}` : ''}{aqNote}
        {' · '}{dict.sources}: 기상청 · 에어코리아 · 천문연 · <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>
      </div>
    </div>
  )
}

function catOfSafe(wx) {
  if (!wx) return 'cloudy'
  if (wx.precip === 'snow') return 'snow'
  if (wx.precip !== 'none' || wx.storm) return 'rain'
  if (wx.fog) return 'fog'
  return wx.sky >= 2 ? 'cloudy' : 'clear'
}
