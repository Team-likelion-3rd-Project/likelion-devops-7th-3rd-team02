import { Outlet } from 'react-router-dom'

// 사이드바와 ProjectProvider는 01-layout 단계에서 붙인다.
function MainLayout() {
  return (
    <main>
      <Outlet />
    </main>
  )
}

export default MainLayout
