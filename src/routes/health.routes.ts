import { Router } from "express";
import { db } from "../config/db";
import { sql } from "drizzle-orm";
import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { R2_BUCKET } from "../config/r2";
import { r2 } from "../config/r2";


//status,uptime,db,timestamp

const router = Router();


router.get('/health', async (_req, res) => {
  let dbLatency: number, r2Latency: number;
  let dbOK = true, r2OK = true;

  const dbStart = Date.now();
  try {
    await db.execute(sql `SELECT 1`);
    dbLatency = Date.now() - dbStart;
  } catch (error) {
    dbOK = false;
    dbLatency = Date.now() - dbStart;
  }

  const r2Start = Date.now();
  try {
    await r2.send(new HeadBucketCommand({ Bucket: R2_BUCKET}));
    r2Latency = Date.now() - r2Start;
  } catch (error) {
    r2OK = false;
    r2Latency = Date.now() - r2Start;
  }

  const healthy = dbOK && r2OK;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    uptime: Math.floor(process.uptime()),
    db: {ok: dbOK, latency_ms: dbLatency},
    r2: {ok: r2OK, latency_ms: r2Latency},
    timestamp: new Date().toISOString(),
  });
});

export default router;