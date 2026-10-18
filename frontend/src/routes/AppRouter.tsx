import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'

import { getAccessToken } from '../utils/authStorage'

import MainLayout from '../layouts/MainLayout'

import LoginPage from '../pages/LoginPage'
import SignupPage from '../pages/SignupPage'
import OAuthCallbackPage from '../pages/OAuthCallbackPage'
import DashboardPage from '../pages/DashboardPage'
import TaskBoardPage from '../pages/TaskBoardPage'
import CicdPage from '../pages/CicdPage'
import MonitoringPage from '../pages/MonitoringPage'
import SettingsPage from '../pages/SettingsPage'
import IncidentsPage from '../pages/IncidentsPage'

function RootRedirect() {
  const accessToken = getAccessToken()

  return <Navigate to={accessToken ? '/projects' : '/login'} replace />
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const accessToken = getAccessToken()

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  return children
}

// 경로는 화면설계서 7.2를 따른다.
function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/projects" element={<DashboardPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/projects/:projectId/tasks" element={<TaskBoardPage />} />
          <Route path="/projects/:projectId/cicd" element={<CicdPage />} />
          <Route
            path="/projects/:projectId/monitoring"
            element={<MonitoringPage />}
          />
          <Route path="/projects/:projectId/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
