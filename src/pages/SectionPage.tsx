import { Link } from 'react-router-dom'

export function SectionPage({ title, description }: { title: string; description: string }) {
  return <>
    <h1 tabIndex={-1}>{title}</h1>
    <p className="intro">{description}</p>
    <Link className="return-link" to="/kana">Browse Kana</Link>
  </>
}
