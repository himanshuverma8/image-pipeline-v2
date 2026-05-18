import { Router } from "express";
import { getUsageStats } from "../services/usage.service";
import { flexAuth } from "../middleware/flexAuth";

const router = Router();
router.use(flexAuth)

router.get('/usage', async (req, res) => {
    const stats = await getUsageStats(req.userId!);
    res.json(stats);
})

export default router;