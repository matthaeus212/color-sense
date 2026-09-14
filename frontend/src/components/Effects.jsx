import { useMemo } from 'react'

const rnd = (a, b) => a + Math.random() * (b - a)

// Build the atmospheric particle/overlay set for a weather composition.
// Memoized on the composition signature so particles only regenerate when weather changes.
function buildEffects(wx, isDay) {
  const night = isDay === 0
  const wet = wx.precip === 'rain' || wx.precip === 'drizzle' || wx.precip === 'sleet' || wx.storm
  const els = { stars: [], glow: null, clouds: [], veil: false, drops: [], flakes: [], bolt: false, dustveil: null, motes: [] }

  // stars (night) / sun glow (day) when sky is open and no fog
  if (!wx.fog && wx.sky <= 2) {
    if (night) {
      const ns = wx.sky <= 1 ? 46 : 20
      for (let i = 0; i < ns; i++) {
        const s = rnd(1, 2.6)
        els.stars.push({ w: s, left: rnd(0, 100), top: rnd(0, 58), delay: rnd(0, 3.2), opacity: wx.sky === 2 ? 0.6 : 1 })
      }
    } else if (!wx.storm) {
      els.glow = { opacity: wx.sky === 0 ? 1 : wx.sky === 1 ? 0.8 : 0.5 }
    }
  }

  // cloud bands: count follows coverage, dark when wet/storm
  let n = wx.sky
  if ((wet || wx.fog) && n < 2) n = 2
  if (wx.storm) n = 3
  const dark = wet || wx.storm
  const rgbBase = dark ? '60,70,88' : '255,255,255'
  const a1 = dark ? 0.52 : 0.4
  for (let i = 0; i < n; i++) {
    const w = rnd(150, 270), h = w * 0.4
    els.clouds.push({
      w, h, top: 14 + i * 18 + rnd(0, 8),
      bg: `radial-gradient(closest-side, rgba(${rgbBase},${a1}), rgba(${rgbBase},0))`,
      dur: rnd(28, 48), delay: -rnd(0, 24),
    })
  }

  if (wx.fog) els.veil = true

  if (wet) {
    const rc = wx.precip === 'drizzle' ? 24 : wx.storm ? 48 : [0, 26, 40, 56][wx.inten] || 40
    const slow = wx.precip === 'drizzle'
    for (let i = 0; i < rc; i++) els.drops.push({ left: rnd(0, 100), dur: (slow ? 0.9 : 0.5) + rnd(0, 0.35), delay: rnd(0, 1), opacity: rnd(0.3, 0.8) })
  }

  if (wx.precip === 'snow' || wx.precip === 'sleet') {
    const sc = [0, 22, 34, 48][wx.inten] || 34
    for (let i = 0; i < sc; i++) { const s = rnd(2, 5); els.flakes.push({ w: s, left: rnd(0, 100), dur: rnd(4, 8), delay: rnd(0, 4), opacity: rnd(0.5, 1) }) }
  }

  if (wx.storm) els.bolt = true

  if (wx.dust) {
    els.dustveil = { opacity: wx.dust === 2 ? 0.9 : 0.55 }
    const nm = wx.dust === 2 ? 30 : 16
    for (let i = 0; i < nm; i++) { const s = rnd(1.5, 4); els.motes.push({ w: s, top: rnd(0, 100), dur: rnd(9, 19), delay: -rnd(0, 16), opacity: rnd(0.25, 0.65) }) }
  }
  return els
}

export default function Effects({ wx, isDay }) {
  const sig = wx ? `${wx.sky}|${wx.precip}|${wx.inten}|${wx.fog ? 1 : 0}|${wx.storm ? 1 : 0}|${wx.dust}|${isDay}` : ''
  const e = useMemo(() => (wx ? buildEffects(wx, isDay) : null), [sig]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!e) return <div className="fx" />
  return (
    <div className="fx">
      {e.stars.map((s, i) => (
        <div key={'s' + i} className="star" style={{ width: s.w, height: s.w, left: s.left + '%', top: s.top + '%', animationDelay: s.delay + 's', opacity: s.opacity }} />
      ))}
      {e.glow && (
        <div className="sunglow" style={{ width: 210, height: 210, top: '56%', opacity: e.glow.opacity, background: 'radial-gradient(circle, rgba(255,240,208,.55), rgba(255,214,160,0) 70%)' }} />
      )}
      {e.clouds.map((c, i) => (
        <div key={'c' + i} className="cloudband" style={{ width: c.w, height: c.h, top: c.top + '%', background: c.bg, animationDuration: c.dur + 's', animationDelay: c.delay + 's' }} />
      ))}
      {e.veil && <div className="veil" />}
      {e.drops.map((d, i) => (
        <div key={'d' + i} className="drop" style={{ left: d.left + '%', animationDuration: d.dur + 's', animationDelay: d.delay + 's', opacity: d.opacity }} />
      ))}
      {e.flakes.map((f, i) => (
        <div key={'f' + i} className="flake" style={{ width: f.w, height: f.w, left: f.left + '%', animationDuration: f.dur + 's', animationDelay: f.delay + 's', opacity: f.opacity }} />
      ))}
      {e.bolt && <div className="bolt" />}
      {e.dustveil && <div className="dustveil" style={{ opacity: e.dustveil.opacity }} />}
      {e.motes.map((m, i) => (
        <div key={'m' + i} className="mote" style={{ width: m.w, height: m.w, top: m.top + '%', animationDuration: m.dur + 's', animationDelay: m.delay + 's', opacity: m.opacity }} />
      ))}
    </div>
  )
}
