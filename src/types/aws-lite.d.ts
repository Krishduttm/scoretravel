import { Readable } from 'node:stream';

export interface S3 {
  putObject(params: {
    Bucket: string;
    Key: string;
    Body: Readable | ReadableStream;
    ContentType: string;
    ContentLength: number;
  }): Promise<{ ETag: string }>;
}

declare module '@aws-lite/client' {
  type AwsLiteConfig = {
    region: string;
    endpoint?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  }

  export default function awsLite(config: AwsLiteConfig): Promise<S3>;
} 