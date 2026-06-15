import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import AnalysisPage from './pages/AnalysisPage';
import SettingsPage from './pages/SettingsPage';
import ProjectsPage from './pages/ProjectsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Navbar from './components/shared/Navbar';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes — no navbar */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes — with navbar */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="min-h-screen">
                  <Navbar />
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/projects" element={<ProjectsPage />} />
                    <Route path="/projects/:id" element={<AnalysisPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Routes>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#0f172a' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#0f172a' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
