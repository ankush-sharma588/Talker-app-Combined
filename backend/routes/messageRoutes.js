const express = require("express");
const { allMessages, sendMessage, uploadFile, deleteMessage } = require("../controllers/messageControllers");
const { protect } = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");

const router = express.Router();

// Absolute path: backend/routes/ → backend/uploads/
const UPLOADS_DIR = path.join(__dirname, "../uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ⚠️ CRITICAL: /upload MUST come before /:chatId
// otherwise Express matches "upload" as chatId and returns 405
router.route("/upload").post(protect, upload.single("file"), uploadFile);
router.route("/:messageId/delete").put(protect, deleteMessage);
router.route("/:chatId").get(protect, allMessages);
router.route("/").post(protect, sendMessage);

module.exports = router;
