// routes/documentRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const documentController = require('../controllers/documentController');
const authenticate = require('../middleware/authenticate');
const ocrReviewController = require('../controllers/ocrReviewController');
const documentSummaryController = require('../controllers/documentSummaryController');

// Configure Multer for Memory Storage
// Limits file size to 10MB to prevent memory exhaustion on Render
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow images and PDFs
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, WEBP, and PDF are allowed.'));
    }
  }
});

// POST /api/documents/upload
// Requires Authentication via JWT
router.post(
  '/upload',
  authenticate,
  upload.single('document'), // 'document' must be the key used in the Flutter Dio FormData
  documentController.uploadDocument
);

router.get('/', authenticate, documentController.getDocuments);

// GET data that needs review
router.get(
  '/review/:uploadId', 
  authenticate, 
  ocrReviewController.getReviewData
);

// POST user's corrections and resolve the review
router.post(
  '/review/:uploadId/resolve', 
  authenticate, 
  ocrReviewController.resolveReviewData
);

router.get('/:uploadId/summary', authenticate, documentSummaryController.getDocumentSummary);

router.patch('/:uploadId/category', authenticate, ocrReviewController.patchCategory);

module.exports = router;