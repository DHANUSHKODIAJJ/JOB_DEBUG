export type ResumeMatch = {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  jdSkills: string[];
  candidateSkills: { term: string; foundInResume: boolean; source: 'acronym' | 'phrase'; verified: false }[];
  note: string;
};

type Skill = { name: string; terms: string[]; weight: number };

const SKILLS: Skill[] = [
  { name: 'JavaScript', terms: ['javascript', 'js'], weight: 2 },
  { name: 'TypeScript', terms: ['typescript'], weight: 2 },
  { name: 'React', terms: ['react', 'react.js', 'reactjs'], weight: 2 },
  { name: 'Angular', terms: ['angular'], weight: 2 },
  { name: 'Vue', terms: ['vue', 'vue.js'], weight: 2 },
  { name: 'Node.js', terms: ['node.js', 'nodejs', 'node js'], weight: 2 },
  { name: 'Express', terms: ['express.js', 'expressjs', 'express js', 'express framework'], weight: 2 },
  { name: 'MongoDB', terms: ['mongodb', 'mongo db'], weight: 2 },
  { name: 'Mongoose', terms: ['mongoose'], weight: 1 },
  { name: 'SQL', terms: ['sql'], weight: 2 },
  { name: 'MySQL', terms: ['mysql'], weight: 2 },
  { name: 'PostgreSQL', terms: ['postgresql', 'postgres'], weight: 2 },
  { name: 'Python', terms: ['python'], weight: 2 },
  { name: 'Java', terms: ['java'], weight: 2 },
  { name: 'Spring Boot', terms: ['spring boot', 'springboot'], weight: 2 },
  { name: 'C#', terms: ['c#', 'c sharp'], weight: 2 },
  { name: '.NET', terms: ['.net', 'dotnet', 'asp.net'], weight: 2 },
  { name: 'HTML', terms: ['html', 'html5'], weight: 1 },
  { name: 'CSS', terms: ['css', 'css3'], weight: 1 },
  { name: 'Git', terms: ['git'], weight: 1 },
  { name: 'REST APIs', terms: ['rest api', 'restful api', 'rest apis'], weight: 2 },
  { name: 'AWS', terms: ['aws', 'amazon web services'], weight: 2 },
  { name: 'Docker', terms: ['docker'], weight: 2 },
  { name: 'Kubernetes', terms: ['kubernetes', 'k8s'], weight: 2 },
  { name: 'Testing', terms: ['unit testing', 'jest', 'vitest', 'junit'], weight: 1 },
];

function containsTerm(text: string, term: string): boolean {
  let start = text.indexOf(term);
  while (start !== -1) {
    const before = start === 0 ? '' : text[start - 1];
    const after = text[start + term.length] ?? '';
    const wordChar = (char: string) => /[a-z0-9]/.test(char);
    if (!wordChar(before) && !wordChar(after)) return true;
    start = text.indexOf(term, start + 1);
  }
  return false;
}

function findSkills(text: string): Skill[] {
  const lower = text.toLowerCase();
  return SKILLS.filter((skill) => skill.terms.some((term) => containsTerm(lower, term)));
}

const IGNORE_ACRONYMS = new Set([
  'JD', 'HR', 'IT', 'CV', 'PDF', 'UG', 'PG', 'CTC', 'LPA', 'WFO', 'WFH',
]);

function extractCandidates(jdText: string, resumeText: string): ResumeMatch['candidateSkills'] {
  const candidates = new Map<string, ResumeMatch['candidateSkills'][number]>();
  const knownTerms = new Set(SKILLS.flatMap((skill) => skill.terms.map((term) => term.toLowerCase())));
  const resumeLower = resumeText.toLowerCase();

  function add(term: string, source: 'acronym' | 'phrase') {
    const clean = term.trim().replace(/^[^a-z0-9]+|[^a-z0-9+#.]+$/gi, '');
    if (clean.length < 2 || clean.length > 40) return;
    const key = clean.toLowerCase();
    if (knownTerms.has(key) || findSkills(clean).length || candidates.has(key)) return;
    candidates.set(key, {
      term: clean,
      foundInResume: containsTerm(resumeLower, key),
      source,
      verified: false,
    });
  }

  for (const match of jdText.matchAll(/\b[A-Z]{2,6}\b/g)) {
    if (!IGNORE_ACRONYMS.has(match[0])) add(match[0], 'acronym');
  }

  const lead = /\b(?:experience with|knowledge of|familiarity with)\s+([^\n.;:]{2,100})/gi;
  for (const match of jdText.matchAll(lead)) {
    for (const part of match[1].split(/,|\band\b|\bor\b|\//i)) {
      const phrase = part.trim().replace(/^(?:the|a|an)\s+/i, '');
      if (phrase.split(/\s+/).length <= 4) add(phrase, 'phrase');
    }
  }

  return [...candidates.values()].slice(0, 30);
}

export function matchResumeToJob(jdText: string, resumeText: string): ResumeMatch {
  const jdSkills = findSkills(jdText);
  const resumeSkills = new Set(findSkills(resumeText).map((skill) => skill.name));
  const matched = jdSkills.filter((skill) => resumeSkills.has(skill.name));
  const missing = jdSkills.filter((skill) => !resumeSkills.has(skill.name));
  const totalWeight = jdSkills.reduce((sum, skill) => sum + skill.weight, 0);
  const matchedWeight = matched.reduce((sum, skill) => sum + skill.weight, 0);

 return {
    score: totalWeight ? Math.round((matchedWeight / totalWeight) * 100) : 0,
    matchedSkills: matched.map((skill) => skill.name),
    missingSkills: missing.map((skill) => skill.name),
    jdSkills: jdSkills.map((skill) => skill.name),
    candidateSkills: extractCandidates(jdText, resumeText),
    note: totalWeight
      ? 'Dictionary keyword overlap only, not a measure of ability. Candidate terms need human review and do not affect the score.'
      : 'No known dictionary skills found in this JD; the 0 score means insufficient evidence, not a poor match. Candidate terms need human review and do not affect the score.',
  };
}

