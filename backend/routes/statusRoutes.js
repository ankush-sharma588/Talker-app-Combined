const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { protect } = require("../middleware/authMiddleware");
const {
  createStatus,
  getStatuses,
  viewStatus,
  deleteStatus,
} = require("../controllers/statusControllers");

const router = express.Router();

// Ensure upload dir exists
const uploadDir = path.join(__dirname, "../uploads/status");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `status-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only images and videos are allowed"), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

router.route("/").get(protect, getStatuses).post(protect, upload.single("media"), createStatus);
router.route("/:id/view").put(protect, viewStatus);
router.route("/:id").delete(protect, deleteStatus);

module.exports = router;
