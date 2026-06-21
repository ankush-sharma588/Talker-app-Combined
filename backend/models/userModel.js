const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    pic: {
      type: String,
      required: true,
      default:
        "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
    },
    isAdmin: {
      type: Boolean,
      required: true,
      default: false,
    },
    theme: {
      mode: { type: String, default: "dark" },
      accent: { type: String, default: "#7c3aed" },
      background: { type: String, default: "default" },
    },
    // FCM registration tokens for this user's devices. An array because a
    // user may be logged in on more than one phone; each token identifies
    // one app install. Tokens are added on login/app-resume and removed if
    // FCM reports them as invalid (uninstalled app, expired token, etc).
    fcmTokens: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model("User", userSchema);
module.exports = User;
