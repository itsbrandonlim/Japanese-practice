import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { StudyRoutes } from './app/router'
import { readTheme } from './app/theme'
import './styles.css'

document.documentElement.dataset.theme = readTheme()
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter><StudyRoutes /></BrowserRouter>
  </StrictMode>,
)
