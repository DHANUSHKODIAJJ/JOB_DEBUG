import { Request, Response, NextFunction } from 'express';
import pdfParse from 'pdf-parse';
import { matchResumeToJob } from '../services/resume-match.service';
import { ApiError } from '../utils/ApiError';

export async function matchResume(req: Request, res: Response, next: NextFunction) {
  try {
    const jdText = req.body.jdText;
    if (typeof jdText !== 'string' || jdText.trim().length < 30 || jdText.length > 10000) {
      throw ApiError.badRequest('Job description must be 30-10000 characters.');
    }
    const resume = req.file;
    if (!resume) throw ApiError.badRequest('Upload a PDF resume in the resume field.');
    if (resume.mimetype !== 'application/pdf' || !resume.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
      throw ApiError.badRequest('Resume must be a PDF.');
    }

    let text: string;
    try {
      const parsed = await pdfParse(resume.buffer);
      text = parsed.text.trim();
    } catch {
      throw ApiError.badRequest('Could not read this PDF. Try a text-based PDF.');
    }
    if (text.length < 50) throw ApiError.badRequest('No readable resume text found. Scanned PDFs are not supported.');
    res.json({ match: matchResumeToJob(jdText, text) });
  } catch (err) {
    next(err);
  }
}

