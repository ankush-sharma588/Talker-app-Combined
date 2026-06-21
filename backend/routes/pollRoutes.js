const express = require("express");
const { createPoll, getPollsByChat, votePoll, closePoll, deletePoll } = require("../controllers/pollControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").post(protect, createPoll);
router.route("/:chatId").get(protect, getPollsByChat);
router.route("/:pollId/vote").put(protect, votePoll);
router.route("/:pollId/close").put(protect, closePoll);
router.route("/:pollId").delete(protect, deletePoll);

module.exports = router;
