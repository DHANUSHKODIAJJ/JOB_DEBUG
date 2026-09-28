import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuth } from '../lib/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      setUser(res.user);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <section aria-label="Job Tracker features" style={{ maxWidth: 760, margin: '0 auto' }}>
        <p className="stat-label">Job Tracker</p>
        <h2>Know what you're applying to.</h2>
        <p>Track the pipeline and check a job post before you apply.</p>
        <div className="bento-grid" style={{ marginTop: 24 }}>
          <div className="card metric-card">
            <strong className="stat-value">3</strong>
            <span className="stat-label">verdict levels</span>
            <p>Looks OK, caution, or danger.</p>
          </div>
          <div className="card metric-card">
            <strong className="stat-value">4</strong>
            <span className="stat-label">company-type outcomes</span>
            <p>Consultancy, training institute, direct employer, or unclear. Rule-based guesses, not proof.</p>
          </div>
          <div className="card metric-card">
            <strong className="stat-value">5</strong>
            <span className="stat-label">classified-ad signals</span>
            <p>Extra checks for thin, phone-first job ads.</p>
          </div>
        </div>
      </section>
      <div className="card" style={{ maxWidth: 420, margin: '4rem auto' }}>
        <h1>Log in</h1>
        <p>Track your job hunt, one application at a time.</p>
        <form onSubmit={onSubmit} aria-busy={loading} style={{ marginTop: '1.5rem' }}>
          {error && <p className="error">{error}</p>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Log in</button>
        </form>
        <p style={{ marginTop: '1rem' }}>
          No account yet? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
