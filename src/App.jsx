import { useState } from 'react'
import AppHeader from './components/AppHeader.jsx'
import Gallery from './views/Gallery.jsx'
import AnatomyView from './views/AnatomyView.jsx'
import TeacherWorkbench from './views/TeacherWorkbench.jsx'
import ExamView from './views/ExamView.jsx'
import ReviewView from './views/ReviewView.jsx'
import ReportsView from './views/ReportsView.jsx'
import { useStore } from './lib/store.jsx'

export default function App() {
  const { state } = useStore()
  const [view, setView] = useState(() => {
    const first = { secretary: 'gallery', teacher: 'workbench', student: 'anatomy' }
    return first[state.user.role]
  })

  const views = {
    gallery: <Gallery onGoExam={() => setView('reports')} />,
    anatomy: <AnatomyView />,
    workbench: <TeacherWorkbench />,
    exam: <ExamView />,
    review: <ReviewView />,
    reports: <ReportsView />
  }

  return (
    <div>
      <AppHeader view={view} setView={setView} />
      <main className="page">{views[view]}</main>
    </div>
  )
}
