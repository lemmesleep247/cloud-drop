import * as Minio from 'minio';
import dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

// Create logger
const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty'
  }
});

// Make sure the bucket name is properly defined
export const bucketName = process.env.MINIO_BUCKET || 'cloud-drop';

const minioConfig = {
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
};

export const minioClient = new Minio.Client(minioConfig);

export const initializeMinio = async (): Promise<void> => {
  try {
    logger.info('Attempting to connect to MinIO with the following configuration:');
    logger.info(`EndPoint: ${minioConfig.endPoint}`);
    logger.info(`Port: ${minioConfig.port}`);
    logger.info(`Use SSL: ${minioConfig.useSSL}`);
    logger.info(`Bucket name: "${bucketName}"`);
    
    if (!bucketName || bucketName.trim() === '') {
      throw new Error('Bucket name is empty or undefined. Check your .env file for MINIO_BUCKET.');
    }
    
    // Skip the listBuckets call that's causing the error
    logger.info('Checking MinIO connection...');
    
    // Instead of listing buckets, directly check if our target bucket exists
    try {
      logger.info(`Checking if bucket '${bucketName}' exists...`);
      const bucketExists = await minioClient.bucketExists(bucketName);
      
      if (!bucketExists) {
        logger.info(`Bucket '${bucketName}' not found. Creating it now...`);
        await minioClient.makeBucket(bucketName, 'us-east-1');
        logger.info(`Bucket '${bucketName}' created successfully!`);
      } else {
        logger.info(`Bucket '${bucketName}' already exists.`);
      }
      
      // If we got here without error, we have a working connection
      logger.info('MinIO connection successful!');
    } catch (err: any) {
      logger.error(err, `Failed to check/create bucket '${bucketName}':`);
      throw new Error(`Bucket operation failed: ${err.message}`);
    }
    
    // Set bucket policy
    try {
      logger.info(`Setting bucket policy for '${bucketName}'...`);
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`]
          }
        ]
      };
      
      await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
      logger.info(`Bucket policy set successfully!`);
    } catch (err: any) {
      logger.warn(err, 'Failed to set bucket policy:');
      logger.warn('This is non-fatal but may affect file accessibility.');
    }
    
    // All steps completed successfully
    logger.info('MinIO initialization completed successfully.');
  } catch (error: any) {
    logger.error(error, 'Failed to initialize MinIO:');
    logger.error('Common issues:');
    logger.error('1. MinIO server is not running');
    logger.error('2. Endpoint or port is incorrect');
    logger.error('3. Access/Secret keys are invalid');
    logger.error('4. Bucket name is invalid or undefined');
    
    if (error.code === 'ECONNREFUSED') {
      logger.error(`Connection refused at ${minioConfig.endPoint}:${minioConfig.port}. Is MinIO running?`);
    } else if (error.code === 'AccessDenied') {
      logger.error('Access denied. Check your access key and secret key.');
    }
    
    process.exit(1);
  }
};
