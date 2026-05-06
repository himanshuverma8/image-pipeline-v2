const sharp = require('sharp');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME;

exports.handler = async (event) => {
  const start = Date.now();
  const { r2_key, params, output_key } = event;

  console.log(JSON.stringify({
    request_id: event.request_id,
    action: 'transform_start',
    params,
  }));

  // fetch the original image from r2
  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: r2_key }));
  const inputBuffer = Buffer.from(await obj.Body.transformToByteArray());

  let pipeline = sharp(inputBuffer);

  if (params.rotate) pipeline = pipeline.rotate(params.rotate);
  if (params.flip) pipeline = pipeline.flip();
  if (params.flop) pipeline = pipeline.flop();

  // resize + crop
  if (params.w || params.h) {
    const opts = { width: params.w, height: params.h };
    if (params.crop) {
      opts.fit = 'cover';
      opts.position = params.crop;
    } else {
      opts.fit = 'inside';
      opts.withoutEnlargement = true;
    }
    pipeline = pipeline.resize(opts);
  }

  // effects
  if (params.blur) pipeline = pipeline.blur(params.blur);
  if (params.sharpen) pipeline = pipeline.sharpen();
  if (params.grayscale) pipeline = pipeline.grayscale();
  if (params.brightness || params.saturation) {
    pipeline = pipeline.modulate({
      brightness: params.brightness,
      saturation: params.saturation,
    });
  }

  // output format
  const fmt = params.fmt || 'jpg';
  const q = params.q || 80;
  switch (fmt) {
    case 'webp': pipeline = pipeline.webp({ quality: q }); break;
    case 'png':  pipeline = pipeline.png({ quality: q }); break;
    case 'avif': pipeline = pipeline.avif({ quality: q }); break;
    default:     pipeline = pipeline.jpeg({ quality: q }); break;
  }

  const outputBuffer = await pipeline.toBuffer();

  // upload transformed image to r2
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: output_key,
    Body: outputBuffer,
    ContentType: `image/${fmt === 'jpg' ? 'jpeg' : fmt}`,
    CacheControl: 'public, max-age=2592000', // 30 days
  }));

  const processingTime = Date.now() - start;
  console.log(JSON.stringify({
    request_id: event.request_id,
    action: 'transform_complete',
    processing_time_ms: processingTime,
    output_size: outputBuffer.length,
  }));

  return {
    transformed_key: output_key,
    cdn_url: `${process.env.R2_PUBLIC_URL}/${output_key}`,
    processing_time_ms: processingTime,
    output_size: outputBuffer.length,
  };
};
