import { Router } from "express";
import { sessionAuth } from "../middleware/session";
import { createKey, listKeys, revokeKey } from "../services/key.service";
import { AppError } from "../middleware/errorHandler";

const router = Router();



//create a new api key on the server 
router.post('/keys', sessionAuth, async (req, res) => {
    const { name } = req.body;
    if (!name) throw new AppError(400, 'BAD_REQUEST', 'Key name is required');

    const result = await createKey(req.userId!, name);

    res.status(201).json({
       key: result.key,
       id: result.id,
       prefix: result.prefix,
       name: result.name
    })
});

//to get all the keys which are created by the user
router.get('/keys', sessionAuth, async (req, res) => {
    const keys = await listKeys(req.userId!);
    res.json({ keys });
});

router.delete('/keys/:id', sessionAuth, async (req, res) => {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) throw new AppError(400, 'BAD_REQUEST', 'Key id is required');

    const revoked = await revokeKey(req.userId!, id);

    if(!revoked) {
        throw new AppError(404, 'Not Found', 'Key Not Found');
    }
    res.json({ message: 'Key Revoked'});
});

export default router;