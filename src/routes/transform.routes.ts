import { Router } from 'express';
import { apiKeyAuth } from '../middleware/auth';
import { transformImage, listTransformations } from '../services/transform.service';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.post('/transform', async (req, res) => {
    const {image_id, ...params} = req.body;
    if (!image_id) throw new AppError(400, 'BAD_REQUEST', 'Required: image_id');
    const result = await transformImage(req.userId!, image_id, params, req.requestId);
    res.json(result);
});

router.post('/images/:id/transforms', apiKeyAuth, async (req, res) => {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) throw new AppError(400, 'BAD_REQUEST', 'Key id is required');
    const transforms = await listTransformations(req.userId!, id);
    res.json({ transformations: transforms});
})

export default router;