import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import Login from './features/auth/Login';
import Register from './features/auth/Register';
import Dashboard from './features/dashboard/Dashboard';
import Employees from './features/employees/Employees';
import EmployeeForm from './features/employees/EmployeeForm';
import Attendance from './features/attendance/Attendance';
import Reports from './features/reports/Reports';
import Users from './features/users/Users';
import Profile from './features/profile/Profile';

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes with sidebar */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="Admin">
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees"
          element={
            <ProtectedRoute requiredRole="Admin">
              <Employees />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/new"
          element={
            <ProtectedRoute requiredRole="Admin">
              <EmployeeForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/:id/edit"
          element={
            <ProtectedRoute requiredRole="Admin">
              <EmployeeForm />
            </ProtectedRoute>
          }
        />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/profile" element={<Profile />} />
        <Route
          path="/reports"
          element={
            <ProtectedRoute requiredRole="Admin">
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute requiredRole="Admin">
              <Users />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
