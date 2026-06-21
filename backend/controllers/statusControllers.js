const asyncHandler = require("express-async-handler");
const Status = require("../models/statusModel");
const path = require("path");
const fs = require("fs");

// @desc   Post a new status
// @route  POST /api/status
// @access Private
const createStatus = asyncHandler(async (req, res) => {
  const { caption, privacy } = req.body;

  if (!req.file) {
    res.status(400);
    throw new Error("Please upload an image or video");
  }

  const mediaUrl = `/uploads/status/${req.file.filename}`;
  const mediaType = req.file.mimetype.startsWith("video") ? "video" : "image";

  const status = await Status.create({
    user: req.user._id,
    mediaUrl,
    mediaType,
    caption: caption || "",
    privacy: privacy || "everyone",
  });

  const populated = await status.populate("user", "name pic");
  res.status(201).json(populated);
});

// @desc   Get statuses visible to the current user
// @route  GET /api/status
// @access Private
const getStatuses = asyncHandler(async (req, res) => {
  const now = new Date();

  // Fetch all non-expired statuses
  let statuses = await Status.find({ expiresAt: { $gt: now } })
    .populate("user", "name pic")
    .populate("viewers.user", "name pic")
    .sort({ createdAt: -1 });

  // Filter by privacy
  statuses = statuses.filter((s) => {
    if (s.user._id.toString() === req.user._id.toString()) return true; // own statuses always visible
    if (s.privacy === "everyone") return true;
    if (s.privacy === "nobody") return false;
    // "contacts" — for simplicity keep it visible (full contacts logic needs chat list)
    return true;
  });

  // Group by user
  const grouped = {};
  statuses.forEach((s) => {
    const uid = s.user._id.toString();
    if (!grouped[uid]) {
      grouped[uid] = { user: s.user, statuses: [] };
    }
    grouped[uid].statuses.push(s);
  });

  res.json(Object.values(grouped));
});

// @desc   Mark a status as viewed
// @route  PUT /api/status/:id/view
// @access Private
const viewStatus = asyncHandler(async (req, res) => {
  const status = await Status.findById(req.params.id);

  if (!status) {
    res.status(404);
    throw new Error("Status not found");
  }

  const alreadyViewed = status.viewers.some(
    (v) => v.user.toString() === req.user._id.toString()
  );

  if (!alreadyViewed) {
    status.viewers.push({ user: req.user._id });
    await status.save();
  }

  res.json({ viewCount: status.viewers.length });
});

// @desc   Delete own status
// @route  DELETE /api/status/:id
// @access Private
const deleteStatus = asyncHandler(async (req, res) => {
  const status = await Status.findById(req.params.id);

  if (!status) {
    res.status(404);
    throw new Error("Status not found");
  }

  if (status.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }

  // Remove file from disk
  const filePath = path.join(__dirname, "..", status.mediaUrl);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await status.deleteOne();
  res.json({ message: "Status deleted" });
});

module.exports = { createStatus, getStatuses, viewStatus, deleteStatus };
