import { Router } from "express";
import { apiKeyAuth } from "../middleware/auth";
import { getImage, listImages, updateImage } from "../services/image.service";

const router = Router();

router.get('/images', apiKeyAuth, async (req, res) => {
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

router.get('image/:id', apiKeyAuth, async (req, res) => {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const result = await getImage(req.userId!, id);
    res.json(result);
})

router.patch('/images/:id', apiKeyAuth, async (req, res) => {
    const { tags, filename } = req.body;
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const result = await updateImage(req.userId!, id, filename);
    res.json(result);
});

export default router;