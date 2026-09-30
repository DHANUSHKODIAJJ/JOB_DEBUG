import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { MatchPage } from './pages/MatchPage';

import { ApplicationsPage } from './pages/ApplicationsPage';
import { CheckJobPage } from './pages/CheckJobPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './lib/auth';
import { logout } from './api/auth';
import { useState, useEffect, useRef } from "react";
import './styles/nav.css'



function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef<HTMLElement | null>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  async function onLogout() {
    setMenuOpen(false);
    await logout().catch(() => {});
    setUser(null);
    navigate('/login');
  }

  return (
    <nav ref={navRef} className={`main-nav ${menuOpen ? "mobile-menu-open menu-open" : ""}`}>

  <button
    type="button"
    className="mobile-menu-toggle"
    onClick={() => setMenuOpen((prev) => !prev)}
    aria-label={menuOpen ? "Close menu" : "Open menu"}
    aria-expanded={menuOpen}
  >
    <span></span>
    <span></span>
    <span></span>
  </button>

  <div className="nav-content">

    {user && (
      <p className="stat-label">
        Logged in as {user.email}
      </p>
    )}

    <Link to="/" onClick={() => setMenuOpen(false)}>
      Dashboard
    </Link>

    <Link to="/applications" onClick={() => setMenuOpen(false)}>
      Applications
    </Link>

    <Link to="/check" onClick={() => setMenuOpen(false)}>
      Check job
    </Link>

    <Link to="/match" onClick={() => setMenuOpen(false)}>
      Match JD &amp; resume
    </Link>

    {user && (
      <button
        type="button"
        className="logout-button"
        onClick={onLogout}
      >
        Log out
      </button>
    )}

  </div>
</nav>
  );
}
function AppContent() {
  const { pathname } = useLocation();
  const isAuthPage = pathname === '/login' || pathname === '/register';

  return (
    <AuthProvider>
      {!isAuthPage && <Nav />}
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
        <Route
          path="/match"
          element={
            <ProtectedRoute>
              <MatchPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
