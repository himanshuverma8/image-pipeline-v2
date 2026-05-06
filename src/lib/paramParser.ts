import { z } from 'zod';

export const transformParamsSchema = z.object({
    w: z.coerce.number().int().min(1).max(4000).optional(),
    h: z.coerce.number().int().min(1).max(4000).optional(),
    fmt: z.enum(['webp', 'png', 'jpg', 'avif']).optional(),
    q: z.coerce.number().int().min(1).max(100).optional(),
    crop: z.enum(['center', 'top', 'bottom', 'left', 'right']).optional(),
    blur: z.coerce.number().min(1).max(20).optional(),
    sharpen: z.coerce.boolean().optional(),
    grayscale: z.coerce.boolean().optional(),
    rotate: z.coerce.number().refine(v => [90, 180, 270].includes(v), { message: 'Must be 90, 180, or 270'}).optional(),
    flip: z.coerce.boolean().optional(),
    flop: z.coerce.boolean().optional(),
    brightness: z.coerce.number().min(0.1).max(3.0).optional(),
    saturation: z.coerce.number().min(0.0).max(3.0).optional()
});

export type TransformParams = z.infer<typeof transformParamsSchema>;