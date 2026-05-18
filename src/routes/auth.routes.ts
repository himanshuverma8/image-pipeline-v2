import passport from 'passport';
import { db } from "../config/db";
import { users } from '../db/schema';
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Router } from 'express';
import { env } from '../config/env';
import crypto from 'crypto';
import { eq, and, gt, count } from 'drizzle-orm';
import { userLogs } from '../db/schema';
import { AppError } from '../middleware/errorHandler';

passport.use(new GoogleStrategy({
clientID: env.GOOGLE_CLIENT_ID,
clientSecret: env.GOOGLE_CLIENT_SECRET,
callbackURL: env.CALLBACK_URL
}, async (_accessToken, _refreshToken, profile, done) => {

    try {

        const googleId = profile.id;
        const email = profile.emails?.[0]?.value || '';
        const name = profile.displayName;
        const photo = profile.photos?.[0]?.value;

        let [user] = await db.select().from(users).where(eq(users.googleId, googleId));
       

        if(!user) {
            const [newUser] = await db.insert(users).values({
                name,
                email,
                googleId,
                storagePrefix: crypto.randomUUID(),
                avatarUrl: photo || null,
            }).returning();
            user = newUser;
        }

        done(null, user);

    } catch (err) {
        done(err as Error)
    }
}));

passport.serializeUser((user: any, done) => {
    done(null, user.id);
})

passport.deserializeUser(async (id: string, done) => {
    try {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        done(null, user || null);

    } catch (err) {
        done(err);
    }
});

const router = Router();

router.post('/auth/guest', async (req, res) => {
    const [user] = await db.select().from(users).where(eq(users.googleId, env.GUEST_ID));

    if (!user) return res.status(500).json({ error: 'Guest user not found' });
    //rate limted the guest
    // In the guest route, before req.logIn():
    const windowStart = new Date(Date.now() - 60_000);
    const raw = req.ip || req.headers['x-forwarded-for'];
    const ip = (Array.isArray(raw) ? raw[0] : raw)?.split(',')[0].trim() || 'unknown';


    const [{ count: recentAttempts }] = await db
        .select({ count: count() })
        .from(userLogs)
        .where(and(
        eq(userLogs.requestIp, ip),
        eq(userLogs.action, 'guest_login'),
        gt(userLogs.timestamp, windowStart)
        ));

    if (recentAttempts >= 5) {
    throw new AppError(429, 'RATE_LIMITED', 'Too many guest login attempts');
    }
 

    
    req.logIn(user, (err) => {
        if (err) {
            return res.status(500).json({error: 'Guest login failed'});
        }
        res.json({ message: 'Logged in as guest'})
    })

});

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/api/auth/failed'}), 
(_req, res) => {
   const FRONTEND_URL = env.NODE_ENV === 'production' 
   ? 'https://console.cdn.hv6.dev'
   : 'http://localhost:5173';
   res.redirect(FRONTEND_URL);
});

router.get('/auth/failed', (_req, res) => {
    res.status(401).json({ error: 'Authentication Failed'});
})

router.post('/auth/logout', (req, res) => {
    req.logout((err) => {
        if(err) {
            res.status(500).json({ error: 'Logout Failed'});
            return;
        } 
        req.session = null;

        res.json({ message: 'Logged Out'});
    });

});

router.get('/auth/me', (req, res) => {
    if (!req.user) {
       return res.status(401).json({ error: 'Not authenticated', code: 'UNAUTHORIZED'});
    }
    res.json(req.user);
})

export default router;

