// Loading / error overlay. Hidden once weather is ready.
export default function StatusOverlay({ status, dict, onRetry }) {
  const on = status === 'locating' || status === 'loading' || status === 'error'
  const err = status === 'error'
  const msg = status === 'error' ? dict.err : status === 'loading' ? dict.loading : dict.locating
  return (
    <div className={'stat' + (on ? ' on' : '') + (err ? ' err' : '')}>
      {!err && <div className="ring" />}
      <div className="msg">{msg}</div>
      {err && <button className="retry" onClick={onRetry}>{dict.retry}</button>}
    </div>
  )
}
