import { Router } from "express"; 
import { createCheck, listChecks, getCheck ,createCheckFromUrl } from '../controllers/check.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createCheckSchema ,checkUrlSchema} from '../validators/check.validator';


export const checkRouter = Router();
checkRouter.use(requireAuth);

checkRouter.route('/').get(listChecks).post(validate(createCheckSchema), createCheck);
checkRouter.route('/:id').get(getCheck);
checkRouter.post('/from-url', validate(checkUrlSchema), createCheckFromUrl);
