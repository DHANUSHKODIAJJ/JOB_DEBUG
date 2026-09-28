import { useState, type FormEvent } from 'react';

type CandidateSkill = {
  term: string;
  foundInResume: boolean;
  source: 'acronym' | 'phrase';
  verified: false;
};

type MatchResult = {
  score: number;
  jdSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  candidateSkills: CandidateSkill[];
  note: string;
};

export function MatchPage() {
  const [jdText, setJdText] = useState('');
  const [resume, setResume] = useState<File | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resume || jdText.trim().length < 30) return;
    setError('');
    setResult(null);
    setLoading(true);

    const form = new FormData();
    form.append('jdText', jdText.trim());
    form.append('resume', resume);

    try {
      const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';
      const response = await fetch(`${baseUrl}/match`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error?.message ?? `Request failed (${response.status})`);
      }
      setResult(data.match as MatchResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not match this resume');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page match-page">
      <h1>JD vs resume</h1>
      <p className="muted">Compare words in a job description with a text-based PDF resume. Nothing is saved here.</p>
      <form className="panel match-form" onSubmit={onSubmit} aria-busy={loading}>
        <label htmlFor="match-jd">Job description</label>
        <textarea
          id="match-jd"
          value={jdText}
          onChange={(event) => setJdText(event.target.value)}
          minLength={30}
          maxLength={10000}
          rows={9}
          required
        />
        <label htmlFor="match-resume">Resume PDF (up to 3 MB)</label>
        <input
          id="match-resume"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(event) => setResume(event.target.files?.[0] ?? null)}
          required
        />
        <button className="btn btn-primary" type="submit" disabled={loading || !resume || jdText.trim().length < 30}>
          {loading ? 'Matching...' : 'Match resume'}
          {loading && <span className="spinner" aria-hidden="true" />}
        </button>
      </form>

      {error && <p className="form-error" role="alert">{error}</p>}
      {result && (
        <section className="panel match-result" aria-live="polite">
          <h2>Dictionary match: {result.score}%</h2>
          <p>{result.note}</p>
          <div className="match-lists">
            <div>
              <h3>Found in both ({result.matchedSkills.length})</h3>
              {result.matchedSkills.length ? <ul>{result.matchedSkills.map((skill) => <li key={skill}>{skill}</li>)}</ul> : <p>None found in the PDF text.</p>}
            </div>
            <div>
              <h3>In JD, not found in PDF ({result.missingSkills.length})</h3>
              {result.missingSkills.length ? <ul>{result.missingSkills.map((skill) => <li key={skill}>{skill}</li>)}</ul> : <p>None from the known dictionary.</p>}
            </div>
          </div>
          <h3>Other possible terms (not scored)</h3>
          {result.candidateSkills.length ? (
            <ul>
              {result.candidateSkills.map((candidate) => (
                <li key={`${candidate.source}-${candidate.term}`}>
                  {candidate.term} - {candidate.foundInResume ? 'word found in PDF' : 'not found in PDF'} (unverified {candidate.source})
                </li>
              ))}
            </ul>
          ) : <p>No other candidate terms found.</p>}
          <p className="muted">A missing word does not mean a missing skill. Review the PDF extraction and JD yourself.</p>
        </section>
      )}
    </main>
  );
}
