import { wxLabel } from '../lib/weather.js'
import { condIcon } from '../lib/icons.js'
import { fmtT, formatTime, formatDate } from '../lib/format.js'

// Top-left block: time / date / condition (icon + label) / big temperature.
export default function DetailHeader({ view, dict, lang, nowMs }) {
  if (!view || view.tempC == null) {
    return (
      <div className="detail">
        <div className="time">— : —</div>
        <div className="date">—</div>
        <div className="cond">{dict.loading}</div>
        <div className="temp">—°</div>
      </div>
    )
  }
  return (
    <div className="detail">
      <div className="time">{formatTime(nowMs, view.offset, lang)}</div>
      <div className="date">{formatDate(view.curTime, lang)}</div>
      <div className="cond">
        <span dangerouslySetInnerHTML={{ __html: condIcon(view.wx, view.isDay) }} />
        <span>{wxLabel(view.wx, dict)}</span>
      </div>
      <div className="temp">{fmtT(view.tempC)}°</div>
      {view.feelsC != null && <div className="feels">{dict.feels} {fmtT(view.feelsC)}°</div>}
    </div>
  )
}
