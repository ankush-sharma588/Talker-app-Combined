const express = require("express");
const {
  registerUser,
  authUser,
  allUsers,
  saveTheme,
  getTheme,
  matchContacts,
  registerPushToken,
  unregisterPushToken,
} = require("../controllers/userControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").get(protect, allUsers).post(registerUser);
router.post("/login", authUser);
router.route("/theme").get(protect, getTheme).put(protect, saveTheme);
router.post("/contacts/match", protect, matchContacts);
router.route("/push-token").post(protect, registerPushToken).delete(protect, unregisterPushToken);

module.exports = router;
