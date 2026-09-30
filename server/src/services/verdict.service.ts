export type Severity = 'low' | 'medium' | 'high';

export interface CheckInput{
    companyName?:string;
    hrEmail?:string;
    jobText:string;
    salaryText?:string;
}

export interface VerdictFlag{
    code:string;
    severity:Severity;
    message:string;
}

export type Verdict = 'looks_ok'|'caution'|'danger';

interface Rule {
  code: string;
  severity: Severity;
  weight: number;
  test: (input: CheckInput) => string | null; 
}
const MONEY_AMOUNT = /(?:\b(?:rs\.?|inr|rupees?)\s*\d[\d,]*(?:\.\d{1,2})?|₹\s*\d[\d,]*(?:\.\d{1,2})?|\b\d[\d,]*(?:\.\d{1,2})?\s*(?:rs\.?|inr|rupees?)\b)/i;
function hasCandidateFeeDemand(jobText: string): boolean {
  const text = jobText
    .toLowerCase()
    .replace(/\btraning\b/g, 'training')
    .replace(/\brs\./g, 'rs')
    .replace(/(\d),(?=\d{3}\b)/g, '$1');

  // Keep negation local. "No registration fee, but pay for training" is still risky.
  const clauses = text.split(/[!?;,\n]+|\.(?=\s|$)|\b(?:but|however|yet)\b|\band(?=\s+(?:pay|payment|deposit|transfer|send|remit|salary|you|candidates?)\b)/);

  return clauses.some((clause) => {
    const paymentText = clause
      .replace(/\b(?:we|company|employer)\s+(?:will\s+)?(?:pay|cover|reimburse)\s+(?:all\s+|the\s+|your\s+)?(?:training|registration|travel)\s+(?:fees?|expenses?|costs?)\b/g, '')
      .replace(/\b(?:no|zero|without)\s+(?:registration|application|processing|training|placement|joining|recruitment|service|security|refundable)(?:\s+(?:or|and)\s+(?:registration|application|processing|training|placement|joining|recruitment|service|security|refundable))+\s+(?:fees?|charges?|deposits?|payments?)\b/g, '')
      .replace(/\b(?:no|zero|without)\s+(?:(?:registration|application|processing|training|placement|joining|recruitment|service|security|refundable)\s+)*(?:fees?|charges?|deposits?|payments?)\b/g, '')
      .replace(/\b(?:fees?|charges?|deposits?|payments?)\s+(?:are\s+|is\s+)?(?:not required|not payable|not charged|waived)\b/g, '')
      .replace(/\b(?:do not|don't|never|not required to|need not)\s+(?:pay|charge|collect|deposit|transfer|send|remit)\b[^.!?;]*$/g, '');

    const namedFee = /\b(?:registration|application|processing|training|placement|joining|recruitment|service|security|refundable)\s+(?:fees?|charges?|deposits?|payments?)\b/.test(paymentText);
    const candidateCharge = /\b(?:fees?|charges?|deposits?)\s+(?:(?:required|payable|mandatory|of)\b|[:=])|\b(?:pay|collect|charge)\s+(?:a\s+|an\s+|the\s+)?(?:fees?|charges?|deposits?)\b/.test(paymentText);
    const payForAccess = /\b(?:pay|payment|deposit|transfer|send|remit)\b.{0,60}\b(?:training|registration|placement|joining|job offer|offer letter|interview|secure (?:a |the )?job)\b/.test(paymentText);

    const employerPayment = /\b(?:we|company|employer)\s+(?:will\s+)?(?:pay|cover|reimburse)\b/.test(paymentText);
    if (namedFee || candidateCharge || (payForAccess && !employerPayment)) return true;

    // An amount alone can be salary. Look for a payment action near it.
    const payments = paymentText.matchAll(/\b(?:pay|payment|deposit|transfer|send|remit)\b/g);
    for (const payment of payments) {
      const before = paymentText.slice(0, payment.index).trimEnd();
      const after = paymentText.slice(payment.index + payment[0].length, payment.index + payment[0].length + 60);
      const employerPays = /\b(?:we|company|employer)(?:\s+will)?$/.test(before);
      const compensation = /\b(?:salary|stipend|allowance|reimbursement|per month|per annum|monthly|annually)\b/.test(after) || /\b(?:salary|stipend|allowance|reimbursement|basic|gross|net|annual|monthly)\s*[:=-]?\s*$/.test(before);
      if (MONEY_AMOUNT.test(after) && !employerPays && !compensation) return true;
    }

    return false;
  });
}
const FREE_MAIL = ['gmail.com', 'yahoo.com', 'yahoo.in', 'outlook.com', 'hotmail.com', 'rediffmail.com'];


const RULES: Rule[] = [
  {
    code: 'fee-demand',
    severity: 'high',
    weight: 10,
    test: ({ jobText }) =>
      /(registration|refundable|security|processing|training)\s*(fee|fees|deposit|charge)/i.test(jobText) ||
      /(pay|payment|deposit)\s+(rs\.?|₹|inr)/i.test(jobText)
        ? 'Asks for money (registration / security deposit / training fee). Real employers never charge candidates.'
        : null,
  },
    {
    code: 'free-email-hr',
    severity: 'high',
    weight: 6,
    test: ({ hrEmail }) => {
      if (!hrEmail) return null;
      const domain = hrEmail.split('@')[1]?.toLowerCase();
      return domain && FREE_MAIL.includes(domain)
        ? `HR writes from ${domain} - genuine companies mail from their own domain.`
        : null;
    },
    },
     {
    code: 'no-interview',
    severity: 'high',
    weight: 7,
    test: ({ jobText }) =>
      /(no interview|without interview|direct joining|direct offer)/i.test(jobText)
        ? 'Promises selection without an interview - a classic bait line.'
        : null,
  },
  {
    code: 'paid-training-institute',
    severity: 'high',
    weight: 7,
    test: ({ jobText }) =>
      /(training (cum|and|with) placement|paid training|course.{0,20}placement|placement.{0,20}course)/i.test(jobText)
        ? 'Looks like a paid-training institute selling a course as a job.'
        : null,
  },
   {
    code: 'consultancy-pattern',
    severity: 'medium',
    weight: 3,
    test: ({ jobText }) =>
      /(consultancy|staffing|manpower|recruitment services|on behalf of (our|a) client|our client is hiring)/i.test(jobText)
        ? 'Reads like a consultancy/staffing post, not a direct company opening.'
        : null,
  },
   {
    code: 'phone-only-contact',
    severity: 'medium',
    weight: 3,
    test: ({ jobText, hrEmail }) => {
      const hasIndianMobile = /(?:^|\D)(?:\+91[\s.-]?|0)?[6-9]\d{9}(?!\d)/m.test(jobText);
      const hasEmail = Boolean(hrEmail?.trim()) || /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(jobText);
      const hasWebsite = /\b(?:https?:\/\/|www\.)[^\s]+/i.test(jobText);
      return hasIndianMobile && !hasEmail && !hasWebsite
        ? 'Only a mobile contact was found; no email or website was provided in this post.'
        : null;
    },
  },
  {
    code: 'guaranteed-job',
    severity: 'medium',
    weight: 4,
    test: ({ jobText }) =>
      /(guaranteed (job|placement)|100% (job|placement|assured))/i.test(jobText)
        ? '"Guaranteed job / 100% placement" - no real company can promise this.'
        : null,
  },
  {
    code: 'weekly-payout-bait',
    severity: 'medium',
    weight: 4,
    test: ({ jobText, salaryText }) =>
      /(weekly|per week)\s*(salary|payout|payment|earning)/i.test(`${jobText} ${salaryText ?? ''}`)
        ? 'Weekly-payout promise - typical of data-entry / typing-job scams.'
        : null,
  },
  {
    code: 'chat-only-contact',
    severity: 'medium',
    weight: 3,
    test: ({ jobText }) =>
      /(whatsapp|telegram)\s*(only|hr|number|contact|resume|cv|apply)/i.test(jobText)
        ? 'Asks you to apply or send your resume over WhatsApp/Telegram instead of a careers page or email.'
        : null,
  },
  {
    code: 'urgency-pressure',
    severity: 'low',
    weight: 2,
    test: ({ jobText }) =>
      /(urgent hiring|limited (slots|seats|openings)|apply immediately|hurry)/i.test(jobText)
        ? 'Urgency pressure ("limited slots", "apply immediately") - a push tactic, weak signal on its own.'
        : null,
  },
  {
    code: 'vague-jd',
    severity: 'low',
    weight: 2,
    test: ({ jobText }) =>
      jobText.trim().length < 200
        ? 'Job description is very short / vague - real postings describe role and skills.'
        : null,
  },
  {
    code: 'urgent-vague-eligibility',
    severity: 'medium',
    weight: 3,
    test: ({ jobText }) =>
      /\burgent\s+(?:requirement|opening|vacancy|hiring)\b/i.test(jobText) &&
      /\b(?:any degree|any graduate|computer knowledge|fresh(?:er)?\s+(?:or|and)\s+experience(?:d)?)\b/i.test(jobText)
        ? 'Urgent hiring paired with broad eligibility and little role detail.'
        : null,
  },
  {
    code: 'mixed-bulk-roles',
    severity: 'medium',
    weight: 3,
    test: ({ jobText }) =>
      /\b(?:non[\s-]?it|non[\s-]?voice)\b/i.test(jobText) &&
      /\b(?:it|non[\s-]?it)\b/i.test(jobText) &&
      /\b(?:non[\s-]?voice|male\s+(?:or|and)\s+female|any degree)\b/i.test(jobText)
        ? 'Broad IT / non-IT / non-voice roles are bundled without a specific opening.'
        : null,
  },
  {
    code: 'classified-contact-hours',
    severity: 'low',
    weight: 1,
    test: ({ jobText }) =>
      /\b(?:contact|call|timings?|time)\s*[:\-]?\s*(?:\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?\s*(?:to|-)\s*\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm))\b/i.test(jobText)
        ? 'Post gives contact hours like a classified ad, not an application process.'
        : null,
  },
  {
    code: 'missing-company-with-classified-signals',
    severity: 'low',
    weight: 2,
    test: ({ companyName, jobText }) =>
      !companyName?.trim() &&
      /\burgent\s+(?:requirement|opening|vacancy|hiring)\b/i.test(jobText) &&
      /(?:^|\D)(?:\+91[\s.-]?|0)?[6-9]\d{9}(?!\d)/m.test(jobText)
        ? 'No company name was provided alongside an urgent phone-contact ad.'
        : null,
  },
   {
    code: 'fee-demand',
    severity: 'high',
    weight: 10,
    test: ({ jobText }) =>
      hasCandidateFeeDemand(jobText)
        ? 'Possible candidate payment demand (fee, training charge or deposit). Do not pay to get a job; verify the offer through the employer.'
        : null,
  },

   {
    code: 'poor-writing-quality',
    severity: 'medium',
    weight: 4,
    test: ({ jobText }) => {
      // Check the original text, before the fee helper corrects "traning".
      const mistakes = jobText.toLowerCase().match(
        /\b(?:traning|vaccancy|recuritment|requirment|exprience|canditate|salery|imediate|garenteed|interveiw|regestration)\b/g,
      ) ?? [];
      const distinctMistakes = new Set(mistakes);
      return mistakes.length >= 3 && distinctMistakes.size >= 2
        ? 'Several common spelling errors were found. Review the post carefully; writing quality alone does not prove a scam.'
        : null;
    },
  },



];
const DANGER_SCORE = 8;
const CAUTION_SCORE = 4;

export function runVerdict(input: CheckInput): {verdict: Verdict; score: number; flags: VerdictFlag[] } {
  const flags: VerdictFlag[] = [];
  let score = 0;

  for (const rule of RULES) {
    const message = rule.test(input);
    if (message) {
      flags.push({ code: rule.code, severity: rule.severity, message });
      score += rule.weight;
    }
  }

    const verdict: Verdict =
    flags.some((f) => f.severity === 'high') || score >= DANGER_SCORE
      ? 'danger'
      : score >= CAUTION_SCORE
        ? 'caution'
        : 'looks_ok';

  return { verdict:verdictFrom(score,flags), score, flags };
}


function verdictFrom(score: number, flags: VerdictFlag[]): Verdict {
  if (flags.some((f) => f.severity === 'high') || score >= DANGER_SCORE) return 'danger';
  if (score >= CAUTION_SCORE) return 'caution';
  return 'looks_ok';
}

// AI can add at most this many points
const AI_MAX_POINTS = 6;

// Below this confidence the AI vote is ignored
const AI_MIN_CONFIDENCE = 0.7;
export function blendWithAi(
  rules: { score: number; flags: VerdictFlag[] },
  aiScamScore: number | null,
): { verdict: Verdict; score: number; flags: VerdictFlag[] } {
  if (aiScamScore === null || aiScamScore < AI_MIN_CONFIDENCE) {
    return { verdict: verdictFrom(rules.score, rules.flags), score: rules.score, flags: rules.flags };
  }

  const flags: VerdictFlag[] = [
    ...rules.flags,
    {
      code: 'ai-suspicious',
      severity: 'medium',
      message: `AI model rates this post ${Math.round(aiScamScore * 100)}% likely to be a scam.`,
    },
  ];
  const score = rules.score + Math.round(aiScamScore * AI_MAX_POINTS);
  return { verdict: verdictFrom(score, flags), score, flags };
}


export type Category = 'legit' | 'consultancy' | 'institute' | 'scam';
export function categorize(flags: VerdictFlag[]): Category {
  const codes = new Set(flags.map((f) => f.code));
  const scamCodes = ['fee-demand', 'no-interview', 'weekly-payout-bait', 'guaranteed-job'];
    const classifiedSignals = [
    'phone-only-contact',
    'urgent-vague-eligibility',
    'mixed-bulk-roles',
    'classified-contact-hours',
    'missing-company-with-classified-signals',
  ];
  if (classifiedSignals.filter((code) => codes.has(code)).length >= 3) return 'scam';

  
  if (flags.some((f) => f.severity === 'high' && scamCodes.includes(f.code))) return 'scam';
  if (codes.has('paid-training-institute')) return 'institute';
  if (codes.has('consultancy-pattern')) return 'consultancy';
  if (codes.has('fee-demand')) return 'scam';
  return 'legit';
}
