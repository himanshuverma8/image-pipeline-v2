import { db } from '../config/db';
import { images, transformations, userLogs } from '../db/schema';
import { eq, count, sum, and, gt } from 'drizzle-orm';

export async function getUsageStats(userId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [[imgStats], [txStats], [todayStats]] = await Promise.all([
    db.select({ total: count(), storage: sum(images.sizeBytes) })
      .from(images).where(eq(images.userId, userId)),
    db.select({ total: count() })
      .from(transformations).where(eq(transformations.userId, userId)),
    db.select({ total: count() })
      .from(userLogs).where(and(eq(userLogs.userId, userId), gt(userLogs.timestamp, todayStart))),
  ]);

  return {
    total_images: imgStats.total,
    total_transformations: txStats.total,
    storage_bytes: Number(imgStats.storage) || 0,
    api_calls_today: todayStats.total,
  };
}