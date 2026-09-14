// Renders a generated SVG markup string. The markup is produced locally from our own
// icon builders (never user input), so dangerouslySetInnerHTML is safe here.
export default function Svg({ markup, className }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: markup }} />
}
