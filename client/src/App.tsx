import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { CheckJobPage } from './pages/CheckJobPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './lib/auth';
import { logout } from './api/auth';

function Nav() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await logout().catch(() => {});
    setUser(null);
    navigate('/login');
  }

  return (
    <nav>
      <Link to="/">Dashboard</Link>
      <Link to="/applications">Applications</Link>
      <Link to="/check">Check job</Link>
      {user && (
        <button style={{ marginLeft: 'auto' }} onClick={onLogout}>
          Log out
        </button>
      )}
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="page">
          <Nav />
        </div>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications"
            element={
              <ProtectedRoute>
                <ApplicationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/check"
            element={
              <ProtectedRoute>
                <CheckJobPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
