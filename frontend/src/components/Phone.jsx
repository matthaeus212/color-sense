import { useEffect, useRef } from 'react'
import { skyGradient } from '../lib/color.js'
import { GEAR_SVG } from '../lib/icons.js'
import Effects from './Effects.jsx'
import SunArc from './SunArc.jsx'
import DetailHeader from './DetailHeader.jsx'
import CityBlock from './CityBlock.jsx'
import DetailSheet from './DetailSheet.jsx'
import Settings from './Settings.jsx'
import StatusOverlay from './StatusOverlay.jsx'

const LOC_ICON = { gps: '◎', default: '⌂', picked: '★' }

// The phone frame + screen. Owns the swipe gesture that opens/closes the sheet.
export default function Phone(props) {
  const {
    view, dict, lang, nowMs, status,
    sheetOpen, onOpenSheet, onCloseSheet,
    settingsOpen, onOpenSettings, onCloseSettings,
    test, onToggleTest, onTest, onReturnLive, onSetLang, onRetry, onPickCity,
  } = props

  const screenRef = useRef(null)
  const start = useRef(null)

  useEffect(() => {
    function up(e) {
      const s = start.current; start.current = null
      if (!s) return
      const dy = e.clientY - s.y, dt = Date.now() - s.t
      if (dt > 800 && Math.abs(dy) < 60) return
      if (dy < -45) onOpenSheet()
      else if (dy > 45) onCloseSheet()
    }
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [onOpenSheet, onCloseSheet])

  const bg = view ? skyGradient(view.tempC, view.wx, view.isDay) : undefined

  return (
    <div className="phone">
      <div
        className="screen"
        ref={screenRef}
        onPointerDown={(e) => {
          // 제스처는 스크롤 영역·설정 패널·입력 요소 밖에서만 시작한다 (시트 내부 스크롤이 시트를 닫던 버그 수정)
          if (settingsOpen || e.target.closest('.dlist, .settings, input, .hlist, .lchip')) { start.current = null; return }
          start.current = { y: e.clientY, t: Date.now() }
        }}
      >
        <div className="sky" style={{ background: bg }} />
        <Effects wx={view && view.wx} isDay={view ? view.isDay : 1} />
        <div className="grain" />

        <div className="content">
          <DetailHeader view={view} dict={dict} lang={lang} nowMs={nowMs} />
          <div className="spacer" />
          <SunArc view={view} lang={lang} nowMs={nowMs} />
          <CityBlock place={view && view.place} />
        </div>

        <div className="gear" title={dict.settings} onClick={onOpenSettings} dangerouslySetInnerHTML={{ __html: GEAR_SVG }} />

        {view && view.badges && view.badges.length > 0 && (
          <div className="badges">{view.badges.map((b) => <span key={b} className={'badge ' + b}>{dict.state[b]}</span>)}</div>
        )}

        {/* 하단 도크 (D10-1·2): 위치 칩(출처 아이콘 + 라벨 + 좌표) → 도시 선택, ⌃ → 상세 시트 */}
        <div className="dock" role="toolbar" aria-label={dict.dockLabel}>
          <button className="lchip" type="button" onClick={onPickCity} aria-label={dict.dockLabel}>
            <span className="pinico" aria-hidden="true">{LOC_ICON[(view && view.locKind) || 'gps']}</span>
            <span className="lk">{dict.locKind[(view && view.locKind) || 'gps']}</span>
            {view && view.place && view.place.code && <span className="coord">{view.place.code}</span>}
          </button>
          <button className="chev" type="button" onClick={onOpenSheet} aria-label={dict.handle}>⌃</button>
        </div>

        <Settings
          open={settingsOpen} dict={dict} lang={lang} test={test}
          onClose={onCloseSettings} onToggleTest={onToggleTest} onTest={onTest}
          onReturnLive={onReturnLive} onSetLang={onSetLang}
        />

        <DetailSheet open={sheetOpen} view={view} dict={dict} lang={lang} onClose={onCloseSheet} />

        <StatusOverlay status={status} dict={dict} onRetry={onRetry} />
      </div>
    </div>
  )
}
