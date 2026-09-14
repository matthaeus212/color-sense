// Bottom-centered place name (city / region-or-country) + coordinate code.
export default function CityBlock({ place }) {
  const p = place || { n1: '—', n2: '', code: '' }
  return (
    <div className="city">
      <div className="n1">{p.n1}</div>
      <div className="n2">{p.n2}</div>
    </div>
  )
}
