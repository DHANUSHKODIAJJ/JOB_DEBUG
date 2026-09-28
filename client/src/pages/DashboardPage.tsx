import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

type CheckStats = {
  totalChecks: number;
  byVerdict: { looks_ok: number; caution: number; danger: number };
  byCategory: { legit: number; consultancy: number; institute: number; scam: number };
};

export function DashboardPage() {
  const [stats, setStats] = useState<CheckStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api<CheckStats>('/checks/stats')
      .then((data) => { if (active) setStats(data); })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load check counts');
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="page dashboard-page">
      <h1>Dashboard</h1>
      <p className="muted">Your saved job checks at a glance. These counts belong to your account.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!stats && !error && <p role="status">Loading counts...</p>}
      {stats && (
        <>
          <section aria-labelledby="check-totals">
            <h2 id="check-totals">Checks and verdicts</h2>
            <div className="dashboard-stats">
              <div className="panel dashboard-stat"><strong>{stats.totalChecks}</strong><span>Total checks</span></div>
              <div className="panel dashboard-stat"><strong>{stats.byVerdict.looks_ok}</strong><span>Looks OK</span></div>
              <div className="panel dashboard-stat"><strong>{stats.byVerdict.caution}</strong><span>Caution</span></div>
              <div className="panel dashboard-stat"><strong>{stats.byVerdict.danger}</strong><span>Danger</span></div>
            </div>
          </section>
          <section aria-labelledby="check-categories">
            <h2 id="check-categories">Category labels</h2>
            <div className="dashboard-stats">
              <div className="panel dashboard-stat"><strong>{stats.byCategory.scam}</strong><span>Scam label</span></div>
              <div className="panel dashboard-stat"><strong>{stats.byCategory.consultancy}</strong><span>Consultancy label</span></div>
              <div className="panel dashboard-stat"><strong>{stats.byCategory.institute}</strong><span>Institute label</span></div>
              <div className="panel dashboard-stat"><strong>{stats.byCategory.legit}</strong><span>No category flag</span></div>
            </div>
            <p className="muted dashboard-note">Labels come from rules on saved checks. "Looks OK" and "No category flag" do not verify an employer.</p>
          </section>
        </>
      )}
      <p className="dashboard-links">
        <Link to="/check">Check another job</Link>
        <Link to="/applications">Go to applications</Link>
      </p>
    </div>
  );
}

