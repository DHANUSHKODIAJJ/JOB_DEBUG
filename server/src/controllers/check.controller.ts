import { Request, Response, NextFunction } from 'express';
import { JobCheck } from '../models/JobCheck';
import { runVerdict, categorize, blendWithAi } from '../services/verdict.service';
import { getAiScamScore } from '../services/ai.service';
import { fetchNaukriJob } from '../services/naukri.service';
import { checkCompanyLocation } from '../services/location.service';
import { ApiError } from '../utils/ApiError';
import { classifyCompanyType } from '../services/company-type.service';
import { CreateCheckInput, CheckUrlInput } from '../validators/check.validator';
import { Types } from 'mongoose';

async function saveCheck(input: CreateCheckInput, userId: string) {
  const rules = runVerdict(input);
  const ai = await getAiScamScore(input.jobText);
  const { verdict, score, flags } = blendWithAi(rules, ai?.scamScore ?? null);
  const category = categorize(rules.flags);

  return JobCheck.create({
    ...input,
    user: userId,
    verdict,
    category,
    score,
    flags,
    ruleScore: rules.score,
    aiUsed: ai !== null,
    ai: ai ?? undefined,
  });
}

export async function createCheck(req: Request, res: Response, next: NextFunction) {
  try {
    const input = req.body as CreateCheckInput;
    const companyType = classifyCompanyType(input);
    const check = await saveCheck(input, req.userId!);
    const companyCard = input.companyName || input.statedLocation
      ? await checkCompanyLocation(input.companyName, input.statedLocation)
      : undefined;
  res.status(201).json({
  check,
  metadata: {
    companyCard,
    companyType,
  },
});
  
     
  } catch (err) {
    next(err);
  }
}

export async function createCheckFromUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const { url } = req.body as CheckUrlInput;
    const posting = await fetchNaukriJob(url);
    const check = await saveCheck({
      jobText: posting.jobText,
      companyName: posting.companyName,
    }, req.userId!);
    const companyCard = await checkCompanyLocation(posting.companyName, posting.statedLocation);

    res.status(201).json({
      check,
      metadata: {
        sourceUrl: url,
        title: posting.title,
        companyName: posting.companyName,
        statedLocation: posting.statedLocation,
        companyCard,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function listChecks(req: Request, res: Response, next: NextFunction) {
  try {
    const checks = await JobCheck.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('-jobText');
    res.json({ checks });
  } catch (err) {
    next(err);
  }
}

export async function getCheck(req: Request, res: Response, next: NextFunction) {
  try {
    const check = await JobCheck.findOne({ _id: req.params.id, user: req.userId });
    if (!check) throw ApiError.notFound('Check not found');
    res.json({ check });
  } catch (err) {
    next(err);
  }
}

export async function getCheckStats(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.userId) throw ApiError.unauthorized('Not logged in');

    const rows = await JobCheck.aggregate<{
      _id: { verdict: string; category: string };
      count: number;
    }>([
      { $match: { user: new Types.ObjectId(req.userId) } },
      { $group: {
        _id: { verdict: '$verdict', category: '$category' },
        count: { $sum: 1 },
      } },
    ]);

    const byVerdict = { looks_ok: 0, caution: 0, danger: 0 };
    const byCategory = { legit: 0, consultancy: 0, institute: 0, scam: 0 };
    let totalChecks = 0;

    for (const row of rows) {
      totalChecks += row.count;
      const verdict = row._id.verdict as keyof typeof byVerdict;
      const category = row._id.category as keyof typeof byCategory;
      if (verdict in byVerdict) byVerdict[verdict] += row.count;
      if (category in byCategory) byCategory[category] += row.count;
    }

    res.json({ totalChecks, byVerdict, byCategory });
  } catch (err) {
    next(err);
  }
}