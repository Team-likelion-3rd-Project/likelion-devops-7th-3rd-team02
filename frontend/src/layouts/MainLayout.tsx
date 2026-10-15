import { Outlet } from 'react-router-dom'

import ProjectGate from '../components/common/ProjectGate'
import Sidebar from '../components/common/Sidebar'
import IncidentProvider from '../context/IncidentProvider'
import ProjectProvider from '../context/ProjectProvider'

function MainLayout() {
  return (
    <ProjectProvider>
      <IncidentProvider>
        <div className="flex min-h-screen bg-page text-ink">
          <Sidebar />

          <main className="min-w-0 flex-1 px-9 pt-7 pb-12 max-[900px]:px-4 max-[900px]:py-5">
            <ProjectGate>
              <Outlet />
            </ProjectGate>
          </main>
        </div>
      </IncidentProvider>
    </ProjectProvider>
  )
}

export default MainLayout
