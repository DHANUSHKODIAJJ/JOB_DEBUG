import { useState, type FormEvent } from 'react';
import { api } from '../api/client';
import { CompanyMap } from '../components/CompanyMap';
import '../styles/Check.css'

type CheckResult = {
    companyName?: string;
  statedLocation?: string;
  verdict: 'looks_ok' | 'caution' | 'danger';
  category?: string;
  score: number;
  flags: { code: string; severity: string; message: string }[];
  aiUsed?: boolean;
  ai?: { label: string; scamScore: number };
}

type CompanyCard={
    status: 'company_office_found' | 'city_only' | 'not_found' | 'unavailable';
  note?: string;
  source?: string;
  attribution?: string;
  address?: string;

};

type CheckResponse = {
  check: CheckResult;
 
metadata?: { companyCard?: CompanyCard; companyType?: CompanyType };

};
const verdictLabels = {
  looks_ok: 'Looks OK',
  caution: 'Caution',
  danger: 'Danger',
};
type CompanyType = {
  type: 'consultancy' | 'training_institute' | 'direct_employer' | 'unclear';
  confidence: 'low' | 'medium';
  reasons: string[];
  note: string;
};

export function CheckJobPage() {
  const [companyName, setCompanyName] = useState('');
  const [statedLocation, setStatedLocation] = useState('');
  const [jobText, setJobText] = useState('');
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [searchedLocation, setSearchedLocation] = useState('');
  const [searchedCompany, setSearchedCompany] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    const name = companyName.trim();
    const location = statedLocation.trim();
      try {
      const response = await api<CheckResponse>('/checks', {
        method: 'POST',
        body: JSON.stringify({
          jobText: jobText.trim(),
          ...(name ? { companyName: name } : {}),
          ...(location ? { statedLocation: location } : {}),
        }),
      });
      setSearchedLocation(location);
      setSearchedCompany(name);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check this job');
    } finally {
      setLoading(false);
    }
  }

  
    const check = result?.check;
    const card = result?.metadata?.companyCard;
    const companyType = result?.metadata?.companyType;
  return (
    <div className="page">
      <h1>Check a job</h1>
      <p>Paste the job description to check for warning signs. A map result is only a search lead.</p>

      <form className="card" onSubmit={onSubmit} style={{ marginTop: '1.5rem' }}>
        <label htmlFor="company-name">Company name</label>
        <input
          id="company-name"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          maxLength={120}
        />
        <label htmlFor="stated-location">Stated city or address (optional)</label>
        <input
          id="stated-location"
          value={statedLocation}
          onChange={(event) => setStatedLocation(event.target.value)}
          maxLength={120}
        />
        <label htmlFor="job-text">Job description</label>
        <textarea
          id="job-text"
          value={jobText}
          onChange={(event) => setJobText(event.target.value)}
          rows={10}
          maxLength={10000}
          required
        />
        <button type="submit" disabled={loading || !jobText.trim()}>
          {loading ? 'Checking...' : 'Check job'}
        </button>
      </form>

      {error && <p className="error" role="alert">{error}</p>}
      {check && (
        <section className="card" aria-label="Check result" style={{ marginTop: '1.5rem' }}>
          <h2>Result: {verdictLabels[check.verdict]}</h2>
          <p>Score: {check.score}</p>
          {check.category && <p>Category: {check.category}</p>}
          <p>This result is a signal, not proof that a company is safe or unsafe.</p>

          <h3>Flags</h3>
          {check.flags?.length ? (
            <ul>
              {check.flags.map((flag, index) => (
                <li key={`${flag.code}-${index}`}>
                  {flag.severity}: {flag.message}
                </li>
              ))}
            </ul>
          ) : <p>No rules flagged this job.</p>}

          <h3 style={{ marginTop: '1rem' }}>Company type (rule-based)</h3>
          {companyType ? (
  <div>
    <p>
      {companyType.type.replaceAll('_', ' ')} - {companyType.confidence} confidence
    </p>
    <ul>
      {companyType.reasons.map((reason, index) => (
        <li key={`${index}-${reason}`}>{reason}</li>
      ))}
    </ul>
    <p>{companyType.note}</p>
  </div>
) : (
  <p>Company type was not returned for this check.</p>
)}

          {check.aiUsed && check.ai && (
            <p>AI signal: {check.ai.label} (scam score {check.ai.scamScore})</p>
          )}

          <h3 style={{ marginTop: '1rem' }}>Company lookup</h3>
          {card ? (
            <div>
              <p>Status: {card.status.replaceAll('_', ' ')}</p>
              {card.address && <p>Map address: {card.address}</p>}
              {card.note && <p>{card.note}</p>}
              {card.attribution && <p>{card.attribution}</p>}
            </div>
          ) : <p>No company lookup returned.</p>}

          <h3 style={{ marginTop: '1rem' }}>Map search</h3>
          <CompanyMap
            companyName={check.companyName || searchedCompany}
            statedLocation={check.statedLocation || searchedLocation}
          />
        </section>
      )}
    </div>
  );
}


 
