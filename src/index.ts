import "./types";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env";
import { requestIdMiddleware } from "./middleware/requestId";
import { loggerMiddleware } from "./middleware/logger";
import healthRoute from "./routes/health.routes";
import { errorHandler } from "./middleware/errorHandler";
import cookieSession from "cookie-session";
import passport from "passport";
import authRoute from "./routes/auth.routes";
import keyRoute from "./routes/key.routes";
import uploadRoutes from "./routes/upload.routes";
import imageRoutes from "./routes/image.routes";
import transformRoutes from "./routes/transform.routes";

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use(
  cookieSession({
    name: "session",
    secret: env.AUTH_SECRET,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: env.NODE_ENV === "production",
    httpOnly: true,
  }),
);

app.use((req, res, next) => {
  if (req.session) {
    req.session.regenerate = (cb) => cb(null);
    req.session.save = (cb) => cb(null);
  }
  next();
});

app.use(passport.initialize());
app.use(passport.session());

app.use(requestIdMiddleware);
app.use(loggerMiddleware);

app.use("/api", healthRoute);
app.use("/api", authRoute);
app.use("/api/v1", keyRoute);
app.use("/api/v1", uploadRoutes);
app.use("/api/v1", imageRoutes);
app.use("/api/v1", transformRoutes);

app.use(errorHandler);

const port = Number(process.env.PORT) || 3000
app.listen(port, '0.0.0.0', () => {
  console.log(`Server on :${port}`)
})