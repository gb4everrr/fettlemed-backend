// routes/chatRoutes.js
// POST /api/chat

'use strict';

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const chatController = require('../controllers/chatController');

// POST /api/chat
// Body: { context: { type, uploadId? }, messages: [...] }
// Response: { reply, meta: { doctorNudge, sourceUploadIds } }
router.post('/', authenticate, chatController.sendMessage);

module.exports = router;