import { useEffect, useState } from 'react';
import { listApplications } from '../api/applications';
import { STATUS_LABELS } from '../lib/constants';
import type { JobApplication } from '../lib/types';
import '../styles/Application.css'
export function ApplicationsPage() {
  const [items, setItems] = useState<JobApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    listApplications()
      .then((res) => {
        if (!active) return;
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load applications');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="page applications-page">
      <header className="applications-head">
        <div>
          <p className="eyebrow">Your pipeline</p>
          <h1>Applications</h1>
          <p className="muted">A clear view of the roles saved in your tracker.</p>
        </div>
        {!loading && !error && (
          <div className="applications-total" aria-label={`${total} total applications`}>
            <strong>{total}</strong>
            <span>Total saved</span>
          </div>
        )}
      </header>

      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && <p role="status">Loading applications...</p>}
      {!loading && !error && items.length === 0 && (
        <div className="panel applications-empty">
          <h2>No applications yet</h2>
          <p>When you save an application, it will appear here.</p>
        </div>
      )}
      {!loading && !error && items.length > 0 && (
        <section aria-label="Saved applications" className="applications-list">
          {items.map((app) => (
            <article className="panel application-item" key={app._id}>
              <div className="application-main">
                <p className="application-company">{app.company?.name || 'Company not available'}</p>
                <h2>{app.role}</h2>
                <p className="application-meta">
                  {[app.location, app.source].filter(Boolean).join(' · ') || 'Details not added'}
                </p>
              </div>
              <span className={`application-status application-status-${app.status}`}>
                {STATUS_LABELS[app.status]}
              </span>
            </article>
          ))}
          {total > items.length && (
            <p className="muted applications-limit">Showing {items.length} of {total}. More pages are not in this view yet.</p>
          )}
        </section>
      )}
    </main>
  );
}
