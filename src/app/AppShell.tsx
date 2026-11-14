import { useLayoutEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ThemeControl } from '../components/ThemeControl'
import { sections } from './sections'

export function AppShell() {
  const { pathname } = useLocation()
  const main = useRef<HTMLElement>(null)
  const previous = useRef(pathname)
  useLayoutEffect(() => {
    const heading = main.current?.querySelector('h1')
    if (!heading) return
    document.title = heading.textContent + ' | Kotoba Study'
    if (previous.current !== pathname && previous.current !== '/') {
      heading.focus()
      window.scrollTo(0, 0)
    }
    previous.current = pathname
  }, [pathname])

  return <>
    <a className="skip-link" href="#content" onClick={event => {
      event.preventDefault()
      main.current?.focus()
    }}>Skip to content</a>
    <header className="masthead">
      <div className="page-width topbar">
        <Link to="/kana" className="brand">
          <img className="brand-mark" src="/favicon.svg" alt="" width="34" height="34" />
          Kotoba Study
        </Link>
        <ThemeControl />
      </div>
      <nav className="page-width navigation" aria-label="Study sections">
        {sections.map(({ path, title }) => <NavLink key={path} to={'/' + path}>{title}</NavLink>)}
      </nav>
    </header>
    <main className="page-width" ref={main} id="content" tabIndex={-1}><Outlet /></main>
  </>
}
