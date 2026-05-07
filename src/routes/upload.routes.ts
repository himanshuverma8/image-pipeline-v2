import { Router } from "express";
import { apiKeyAuth } from "../middleware/auth";
import { getPresignedUploadUrl, uploadFromUrl } from '../services/upload.service';
import { AppError } from "../middleware/errorHandler";

const router = Router();

router.post('/upload', apiKeyAuth, async (req, res) => {
    const { fileName, content_type, size } = req.body;

    if (!fileName || !content_type || !size) {
        throw new AppError(400, 'BAD_REQUEST', 'Required: filename, content_type, size');
    }
    const result = await getPresignedUploadUrl(req.userId!, fileName, content_type, size);

    res.status(201).json(result);
});

router.post('/upload/url', apiKeyAuth, async (req, res) => {
    const { url } = req.body;
     if (!url) throw new AppError(400, 'BAD_REQUEST', 'Required: url');
     const result = await uploadFromUrl(req.userId!, url);

     res.status(201).json(result);

})

export default router;