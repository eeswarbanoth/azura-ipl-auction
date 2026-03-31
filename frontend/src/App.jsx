import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';

// Skeleton Pages
import Login from './pages/Auth/Login';
import AdminDashboard from './pages/Admin/Dashboard';
import FranchiseDashboard from './pages/Franchise/Dashboard';
import ProjectorDisplay from './pages/Projector/ProjectorDisplay';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          
          {/* Public / Auth Route */}
          <Route path="/login" element={<Login />} />

          {/* Admin Routes */}
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute roleRequired="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Franchise Routes */}
          <Route 
            path="/franchise/*" 
            element={
              <ProtectedRoute roleRequired="franchise">
                <FranchiseDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Projector Mode Route - could be protected or public based on setup. Making it protected for Admin. */}
          <Route 
            path="/projector" 
            element={
              <ProtectedRoute roleRequired="admin">
                <ProjectorDisplay />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
