import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"
import { env } from "../config/env"
import { AppError } from "../middleware/errorHandler"

const lambda = new LambdaClient({
    region: env.AWS_REGION,
    credentials: env.AWS_ACCESS_KEY_ID ? {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
    } : undefined
});

export interface TransformPayload {
    r2_key: string;
    params: Record<string, unknown>;
    request_id: string;
    user_id: string;
    output_key: string;
}

export interface TransformResult {
    transformed_key: string;
    cdn_url: string;
    processing_time_ms: number;
    output_size: number;
}

export async function invokeTransformLambda(payload: TransformPayload): Promise<TransformResult> {
    if (!env.LAMBDA_FUNCTION_NAME) {
        throw new AppError(500, 'CONFIG_ERROR', 'LAMBDA_FUNCTION_NAME not configured');
    }

    const response = await lambda.send(new InvokeCommand({
        FunctionName: env.LAMBDA_FUNCTION_NAME,
        InvocationType: 'RequestResponse',
        Payload: Buffer.from(JSON.stringify(payload))
    }));

    if (response.FunctionError) {
    const errorPayload = JSON.parse(new TextDecoder().decode(response.Payload));
    throw new AppError(422, 'TRANSFORM_FAILED', errorPayload.errorMessage || 'Transform failed');
  }

  if (!response.Payload) {
    throw new AppError(500, 'TRANSFORM_FAILED', 'Lambda returned empty response');
  }

  return JSON.parse(new TextDecoder().decode(response.Payload));
}