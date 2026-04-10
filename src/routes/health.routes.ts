import { Router } from "express";
import { db } from "../config/db";
import { sql } from "drizzle-orm";


//status,uptime,db,timestamp

const router = Router();


router.get('/health', async (_req, res) => {
    const start = Date.now();

    try {
        await db.execute(sql `SELECT 1`);
        res.json({
            status: 'healthy',
            uptime: Math.floor(process.uptime()),
            db: { latency_ms: Date.now() - start },
            timestamp: new Date().toISOString(),
        })
    } catch (err) {
        res.status(503).json({ status: 'unhealthy', error: (err as Error).message })
    }
})

export default router;