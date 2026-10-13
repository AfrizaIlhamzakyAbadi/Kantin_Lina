import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="notice-card page-narrow" aria-labelledby="notfound-title">
      <header className="page-headline">
        <h1 id="notfound-title">&gt; HTTP 404: FILE NOT FOUND</h1>
      </header>
      <p style={{ margin: '14px 0' }}>The requested document URL was not found on this server.</p>
      <Link to="/" className="btn btn-primary" id="notfound-home">
        &lt;&lt; RETURN TO HOME
      </Link>
    </section>
  )
}
