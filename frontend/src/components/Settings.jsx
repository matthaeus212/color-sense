const COND_KEYS = ['clear', 'pcloudy', 'overcast', 'rain', 'showers', 'snow', 'sleet', 'fog', 'storm', 'finedust', 'yellowdust']
const DAY_KEYS = ['day', 'night']

function Chips({ items, active, onPick }) {
  return (
    <div className="chips">
      {items.map(({ key, label }) => (
        <button key={key} className={active === key ? 'on' : ''} onClick={() => onPick(key)}>{label}</button>
      ))}
    </div>
  )
}

// Settings panel: color-test lab + language switch.
export default function Settings({ open, dict, lang, test, onClose, onToggleTest, onTest, onReturnLive, onSetLang }) {
  const condItems = COND_KEYS.map((k) => ({ key: k, label: dict.condChips[k] }))
  const dayItems = DAY_KEYS.map((k) => ({ key: k, label: dict.dayChips[k] }))
  const dayActive = test.day ? 'day' : 'night'

  return (
    <div className={'settings' + (open ? ' open' : '')}>
      <div className="sethead">
        <div className="stt">{dict.settings}</div>
        <button className="x" onClick={onClose}>×</button>
      </div>

      <div className="slabel">{dict.colorTest}</div>
      <div className="sdesc">{dict.colorTestDesc}</div>
      <button className={'tbtn' + (test.on ? ' on' : '')} onClick={onToggleTest}>
        {test.on ? dict.ctRunning : dict.ctOn}
      </button>

      <div className="ctpanel" hidden={!test.on}>
        <div>
          <div className="row"><span>{dict.lblTemp}</span><span>{test.temp}°</span></div>
          <input type="range" min="-10" max="38" value={test.temp} onChange={(e) => onTest({ temp: +e.target.value })} />
        </div>
        <div>
          <div className="cl">{dict.lblWeather}</div>
          <Chips items={condItems} active={test.cond} onPick={(k) => onTest({ cond: k })} />
        </div>
        <div>
          <div className="cl">{dict.lblTime}</div>
          <Chips items={dayItems} active={dayActive} onPick={(k) => onTest({ day: k === 'day' })} />
        </div>
        <button className="livebtn" onClick={onReturnLive}>{dict.returnLive}</button>
      </div>

      <div className="slabel" style={{ marginTop: 28 }}>{dict.language}</div>
      <div className="chips">
        <button className={lang === 'ko' ? 'on' : ''} onClick={() => onSetLang('ko')}>한국어</button>
        <button className={lang === 'en' ? 'on' : ''} onClick={() => onSetLang('en')}>English</button>
      </div>
    </div>
  )
}
