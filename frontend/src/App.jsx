import { Routes, Route } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import AdminLayout from './layouts/AdminLayout'
import JobList from './pages/public/JobList'
import JobDetail from './pages/public/JobDetail'
import ApplyForm from './pages/public/ApplyForm'
import ApplySuccess from './pages/public/ApplySuccess'
import NotFound from './pages/public/NotFound'
import Login from './pages/admin/Login'
import Dashboard from './pages/admin/Dashboard'
import JobsManage from './pages/admin/JobsManage'
import JobForm from './pages/admin/JobForm'
import ApplicationsManage from './pages/admin/ApplicationsManage'
import ApplicationDetail from './pages/admin/ApplicationDetail'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      {/* Public area */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<JobList />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/jobs/:id/apply" element={<ApplyForm />} />
        <Route path="/jobs/:id/apply/success" element={<ApplySuccess />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Admin login (no layout, no auth) */}
      <Route path="/admin/login" element={<Login />} />

      {/* Admin area: auth-protected, shares the AdminLayout */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="jobs" element={<JobsManage />} />
        <Route path="jobs/new" element={<JobForm />} />
        <Route path="jobs/:id/edit" element={<JobForm />} />
        <Route path="applications" element={<ApplicationsManage />} />
        <Route path="applications/:id" element={<ApplicationDetail />} />
      </Route>
    </Routes>
  )
}
