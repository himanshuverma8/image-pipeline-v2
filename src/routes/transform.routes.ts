import { Router } from 'express';
import { transformImage, listTransformations } from '../services/transform.service';
import { AppError } from '../middleware/errorHandler';
import { flexAuth } from '../middleware/flexAuth';

const router = Router();
router.use(flexAuth);

router.post('/transform', async (req, res) => {
    const {user_id, image_id, ...params} = req.body;
    if (!image_id) throw new AppError(400, 'BAD_REQUEST', 'Required: image_id');
    if (!user_id) throw new AppError(400, 'BAD_REQUEST', 'Required: user_id');
    const result = await transformImage(user_id, image_id, params, req.requestId);
    res.json(result);
});

router.get('/images/:id/transforms', async (req, res) => {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) throw new AppError(400, 'BAD_REQUEST', 'Key id is required');
    const transforms = await listTransformations(req.userId!, id);
    res.json({ transformations: transforms});
})

export default router;