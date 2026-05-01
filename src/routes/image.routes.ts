import { Router } from "express";
import { apiKeyAuth } from "../middleware/auth";
import { getImage, listImages, updateImage } from "../services/image.service";

const router = Router();
router.use(apiKeyAuth);

router.get('/images', async (req, res) => {
    const { page = '1', limit = '20', search, format, sort = 'newest' } = req.query;
    const result = await listImages(req.userId!, {
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        format: format as string,
        sort: sort as 'newest' | 'oldest'
    })
    res.json(result);
})

router.get('image/:id', async (req, res) => {
    const result = await getImage(req.userId!, req.params.id);
    res.json(result);
})

router.patch('/images/:id', async (req, res) => {
    const { tags, filename } = req.body;
    const result = await updateImage(req.userId!, req.params.id, filename);
    res.json(result);
});

export default router;