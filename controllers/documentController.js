// controllers/documentController.js
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { Queue } = require('bullmq');
const crypto = require('crypto');
const path = require('path');
const { ReportUpload, PatientProfile } = require('../models');

// Initialize S3 Client for Mumbai Region
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Initialize BullMQ Queue for Redis
const documentProcessingQueue = new Queue('document-ocr-queue', {
  connection: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  }
});

exports.uploadDocument = async (req, res) => {
  try {
    const { report_type } = req.body;
    const file = req.file;

    // 1. Get the Auth User ID from the token
    const userId = req.user.id; 

    // 2. NEW: Securely look up their associated Patient Profile ID
    const patientProfile = await PatientProfile.findOne({ where: { user_id: userId } });
    
    if (!patientProfile) {
      return res.status(404).json({ message: 'No patient profile linked to this account.' });
    }
    const patientProfileId = patientProfile.id;

    if (!file) {
      return res.status(400).json({ message: 'No document file provided.' });
    }
    if (!report_type) {
      return res.status(400).json({ message: 'report_type is required.' });
    }

    const { force } = req.body; // If true, patient is overriding all upload-time duplicate warnings

    // --- LAYER 1: SHA-256 hash check ---
    // Computed from raw bytes before S3 upload. A hash match is very strong evidence
    // the exact same file has been uploaded before, but we treat it as a soft warning —
    // patient may be legitimately retrying after a FAILED or DUPLICATE status.
    const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');

    if (!force) {
      const hashMatch = await ReportUpload.findOne({
        where: { patient_profile_id: patientProfileId, file_hash: fileHash }
      });
      if (hashMatch) {
        return res.status(409).json({
          code: 'DUPLICATE_HASH',
          message: 'This exact document appears to have already been uploaded.',
          existing_upload_id: hashMatch.id
        });
      }

      // --- LAYER 2: Original filename check ---
      // Weaker heuristic than hash — same filename could be a different scan, or two
      // legitimately different documents. Always overrideable. Note: iOS camera captures
      // generate a new UUID filename per capture, so this only fires reliably for
      // gallery/file-picker selections.
      const nameMatch = await ReportUpload.findOne({
        where: { patient_profile_id: patientProfileId, original_filename: file.originalname }
      });
      if (nameMatch) {
        return res.status(409).json({
          code: 'DUPLICATE_FILENAME',
          message: 'A document with this filename has already been uploaded.',
          existing_upload_id: nameMatch.id
        });
      }
    }

    // 3. Generate a unique S3 Key
    const fileExtension = path.extname(file.originalname);
    const uniqueFileName = `${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
    const s3Key = `patients/${patientProfileId}/uploads/${uniqueFileName}`;
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    // 4. Upload file to AWS S3
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });
    
    await s3Client.send(putCommand);
    const s3FileUrl = `s3://${bucketName}/${s3Key}`;

// 5. Create the PENDING database record using the CORRECT ID
    const newReport = await ReportUpload.create({
      patient_profile_id: patientProfileId,
      report_type: report_type,
      upload_url: s3FileUrl,
      original_filename: file.originalname,
      file_hash: fileHash,
      status: 'PENDING',
      uploaded_at: new Date()
    });

    // 6. Push Job to Redis Queue for AI Processing (Matches worker.js payload)
    // jobId is set to uploadId so the worker's stalled handler can map back to the
    // correct ReportUpload row. Without this, BullMQ assigns its own auto-increment
    // ID and the stalled event cannot identify which upload to mark FAILED.
    await documentProcessingQueue.add('extract-vitals-and-data', {
      uploadId: newReport.id,
      s3Bucket: bucketName,
      s3Key: s3Key,
      patientProfileId: patientProfileId,
      expectedCategory: report_type
    }, {
      jobId: `upload_${newReport.id}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 }
    });

    return res.status(201).json({ message: 'Upload successful, processing started', upload: newReport });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Upload failed' });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const userId = req.user.id; 

    // Securely look up the profile
    const patientProfile = await PatientProfile.findOne({ where: { user_id: userId } });
    
    if (!patientProfile) {
      return res.status(200).json({ data: [] }); // If no profile, they have no documents
    }
    const patientProfileId = patientProfile.id;

    // Fetch records using the correct profile ID
    const documents = await ReportUpload.findAll({
      where: { patient_profile_id: patientProfileId },
      order: [['uploaded_at', 'DESC']]
    });

    // 3. Generate Presigned URLs for each document
    const documentsWithUrls = await Promise.all(documents.map(async (doc) => {
      const s3UriParts = doc.upload_url.replace('s3://', '').split('/');
      s3UriParts.shift(); // Remove the bucket name
      const s3Key = s3UriParts.join('/');

      const getCommand = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME, 
        Key: s3Key,
      });

      // URL expires in 1 hour
      const presignedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

      return {
        id: doc.id,
        report_type: doc.report_type,
        status: doc.status,
        uploaded_at: doc.uploaded_at,
        original_filename: doc.original_filename ?? null,
        view_url: presignedUrl
      };
    }));

    // 4. Return the parsed documents
    return res.status(200).json({ data: documentsWithUrls });

  } catch (error) {
    console.error('Error fetching documents:', error);
    return res.status(500).json({ error: 'Failed to fetch documents' });
  }
};