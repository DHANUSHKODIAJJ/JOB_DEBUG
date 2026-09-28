import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.middleware';
import { matchResume } from '../controllers/match.controller';
import { ApiError } from '../utils/ApiError';

export const matchRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1, fields: 1, fieldSize: 20 * 1024 },
});


const receiveResume = upload.single('resume');
matchRouter.post('/', requireAuth, receiveResume, matchResume);
