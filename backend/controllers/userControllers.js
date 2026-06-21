const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const generateToken = require("../config/generateToken");

//@description     Get or Search all users
//@route           GET /api/user?search=
//@access          Public
const allUsers = asyncHandler(async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
      }
    : {};

  const users = await User.find(keyword).find({ _id: { $ne: req.user._id } });
  res.send(users);
});

//@description     Register new user
//@route           POST /api/user/
//@access          Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, pic } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please Enter all the Feilds");
  }

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  const user = await User.create({
    name,
    email,
    password,
    pic,
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      pic: user.pic,
      theme: user.theme,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error("User not found");
  }
});

//@description     Auth the user
//@route           POST /api/users/login
//@access          Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      pic: user.pic,
      theme: user.theme,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error("Invalid Email or Password");
  }
});

//@description     Save user theme preferences
//@route           PUT /api/user/theme
//@access          Private
const saveTheme = asyncHandler(async (req, res) => {
  const { mode, accent, background } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.theme = {
    mode: mode || user.theme.mode,
    accent: accent || user.theme.accent,
    background: background || user.theme.background,
  };

  await user.save();
  res.json({ theme: user.theme });
});

//@description     Get user theme preferences
//@route           GET /api/user/theme
//@access          Private
const getTheme = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("theme");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  res.json({ theme: user.theme });
});




//@description     Match contacts (emails/phones) against registered users
//@route           POST /api/user/contacts/match
//@access          Private
const matchContacts = asyncHandler(async (req, res) => {
  const { contacts } = req.body; // array of { name, phone, email }
  if (!contacts || !Array.isArray(contacts)) {
    res.status(400);
    throw new Error("contacts array required");
  }

  const emails = contacts
    .map((c) => (c.email || "").toLowerCase().trim())
    .filter(Boolean);

  const registeredUsers = await User.find({
    email: { $in: emails },
    _id: { $ne: req.user._id },
  }).select("_id name email pic");

  const registeredEmails = new Set(registeredUsers.map((u) => u.email.toLowerCase()));

  const matched = registeredUsers.map((u) => {
    const contact = contacts.find(
      (c) => (c.email || "").toLowerCase().trim() === u.email.toLowerCase()
    );
    return {
      _id: u._id,
      name: u.name,
      email: u.email,
      pic: u.pic,
      contactName: contact ? contact.name : u.name,
    };
  });

  const unmatched = contacts.filter(
    (c) => c.email && !registeredEmails.has((c.email || "").toLowerCase().trim())
  );

  res.json({ matched, unmatched });
});

//@description     Save an FCM device token for the logged-in user (called by
//                  the Android app on login and on every app startup, since
//                  tokens can rotate)
//@route           POST /api/user/push-token
//@access          Private
const registerPushToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    res.status(400);
    throw new Error("token is required");
  }
  await User.updateOne(
    { _id: req.user._id },
    { $addToSet: { fcmTokens: token } } // $addToSet avoids duplicate tokens for the same device
  );
  res.json({ success: true });
});

//@description     Remove an FCM token (called on logout so a signed-out
//                  device stops receiving pushes for the previous account)
//@route           DELETE /api/user/push-token
//@access          Private
const unregisterPushToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    res.status(400);
    throw new Error("token is required");
  }
  await User.updateOne({ _id: req.user._id }, { $pull: { fcmTokens: token } });
  res.json({ success: true });
});

module.exports = {
  allUsers,
  registerUser,
  authUser,
  saveTheme,
  getTheme,
  matchContacts,
  registerPushToken,
  unregisterPushToken,
};
