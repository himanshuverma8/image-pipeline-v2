import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
    DATABASE_URL: z.string(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    AUTH_SECRET: z.string(),
    CALLBACK_URL: z.string().default('http://localhost:3000/api/auth/google/callback'),

  R2_ACCESS_KEY_ID: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),
  R2_BUCKET_NAME: z.string(),
  R2_ACCOUNT_ID: z.string(),
  R2_PUBLIC_URL: z.string(),

  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('ap-south-1'),
  LAMBDA_FUNCTION_NAME: z.string().optional(),

  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export type Env = z.infer<typeof envSchema >;

function validateEnv(): Env {
    const result = envSchema.safeParse(process.env);
    if(!result.success) {
        console.error('Invalid enviroment variables');
        for (const issue of result.error.issues) {
            console.error(` ${issue.path.join('.')}: ${issue.message}`);
        }
        process.exit(1);
    }
    return result.data;
}

export const env = validateEnv();
