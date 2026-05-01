import crypto from 'crypto';
import { TransformParams } from './paramParser';

export function hashParams(params: Partial<TransformParams>): string {
    const sorted = Object.keys(params)
        .filter(k => params[k as keyof TransformParams] !== undefined)
        .sort()
        .map(k => `${k}=${params[k as keyof TransformParams]}`)
        .join('&')
    return crypto.createHash('sha256').update(sorted).digest('hex').slice(0,16);
}