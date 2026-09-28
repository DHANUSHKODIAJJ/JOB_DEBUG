import { Request, Response, NextFunction } from 'express';
import { JobCheck } from '../models/JobCheck';
import { runVerdict, categorize, blendWithAi } from '../services/verdict.service';
import { getAiScamScore } from '../services/ai.service';
import { fetchNaukriJob } from '../services/naukri.service';
import { checkCompanyLocation } from '../services/location.service';
import { ApiError } from '../utils/ApiError';
import { classifyCompanyType } from '../services/company-type.service';
import { CreateCheckInput, CheckUrlInput } from '../validators/check.validator';

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
