import { Navigate, Route, Routes } from 'react-router-dom'
import { KanaPage } from '../pages/KanaPage'
import { KanjiPage } from '../pages/KanjiPage'
import { KanjiDetailPage } from '../pages/KanjiDetailPage'
import { SectionPage } from '../pages/SectionPage'
import { ProgressPage } from '../pages/ProgressPage'
import { PracticePage } from '../pages/PracticePage'
import { SpeakPage } from '../pages/SpeakPage'
import { AppShell } from './AppShell'

export function StudyRoutes() {
  return <Routes>
    <Route element={<AppShell />}>
      <Route index element={<Navigate replace to="/kana" />} />
      <Route path="kana" element={<KanaPage />} />
      <Route path="kanji" element={<KanjiPage />} />
      <Route path="kanji/:id" element={<KanjiDetailPage />} />
      <Route path="practice" element={<PracticePage />} />
      <Route path="speak" element={<SpeakPage />} />
      <Route path="progress" element={<ProgressPage />} />
      <Route path="*" element={<SectionPage title="Page not found" description="This address doesn’t match a study page." />} />
    </Route>
  </Routes>
}
