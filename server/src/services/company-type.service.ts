export type CompanyType = 'consultancy' | 'training_institute' | 'direct_employer' | 'unclear';

type CompanyTypeInput = {
  companyName?: string;
  jobText: string;
};

type CompanyTypeResult = {
  type: CompanyType;
  confidence: 'low' | 'medium';
  reasons: string[];
  note: string;
};

export function classifyCompanyType({ companyName = '', jobText }: CompanyTypeInput): CompanyTypeResult {
  const name = companyName.trim();
  const text = jobText.trim();
  const consultancy: string[] = [];
  const institute: string[] = [];
  const direct: string[] = [];

  if (/\b(staffing|recruitment|manpower|hr solutions|placement services|employment agency)\b/i.test(name)) {
    consultancy.push('Company name mentions recruitment or staffing');
  }
  if (/\b(on behalf of (our|a) client|our client is hiring|hiring for (our|a) client|third.party payroll|client payroll)\b/i.test(text)) {
    consultancy.push('Post says the role is for a client or on a third-party payroll');
  }
  if (/\b(consultancy|staffing agency|recruitment agency)\b/i.test(text)) {
    consultancy.push('Post mentions a consultancy or staffing agency');
  }

  if (/\b(training (institute|academy|center|centre)|placement academy|career academy)\b/i.test(name)) {
    institute.push('Company name suggests a training institute');
  }
  if (/\b(enroll(?:ment)?|admission|course batch|training batch|batch starts|join our course)\b/i.test(text)) {
    institute.push('Post describes course enrollment or batches');
  }
  if (/\b(training (cum|and|with) placement|paid training|course.{0,30}placement|placement.{0,30}course)\b/i.test(text)) {
    institute.push('Post links training or a course with placement');
  }

  if (/\b(our (product|engineering|development) team|build (our|the) product|join our engineering team)\b/i.test(text)) {
    direct.push('Post describes work on the employer\'s own team or product');
  }
  if (/\b(you will (build|develop|maintain)|responsible for (building|developing|maintaining))\b/i.test(text)) {
    direct.push('Post describes hands-on work responsibilities');
  }

  const feeMention = /\b(registration|processing|security|training|placement)\s*(fee|fees|deposit|charge)\b|\b(pay|payment|deposit)\s+(rs\.?|inr|₹)/i.test(text);
  const noFeeStatement = /\b(no|without|never)\s+(registration|processing|training|placement)?\s*(fee|fees|charge|payment)\b/i.test(text);
  const feeReason = feeMention && !noFeeStatement
    ? ['Post mentions a possible candidate payment; inspect the exact wording']
    : [];

  let type: CompanyType = 'unclear';
  let reasons: string[] = [];
  let confidence: CompanyTypeResult['confidence'] = 'low';

  if (consultancy.length && institute.length) {
    reasons = [...consultancy, ...institute];
  } else if (institute.length) {
    type = 'training_institute';
    reasons = institute;
    confidence = institute.length > 1 ? 'medium' : 'low';
  } else if (consultancy.length) {
    type = 'consultancy';
    reasons = consultancy;
    confidence = consultancy.length > 1 ? 'medium' : 'low';
  } else if (direct.length >= 2 && name && !feeReason.length) {
    type = 'direct_employer';
    reasons = direct;
    confidence = 'low';
  } else {
    reasons = direct.length ? direct : ['Not enough evidence in the name or job description'];
  }

  return {
    type,
    confidence,
    reasons: [...reasons, ...feeReason],
    note: 'Rule-based guess, not company verification. A consultancy or institute can be genuine; a direct-employer label does not prove safety.',
  };
}
