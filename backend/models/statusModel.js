const mongoose = require("mongoose");

const statusSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: ["image", "video"], required: true },
    caption: { type: String, default: "" },
    viewers: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    privacy: {
      type: String,
      enum: ["everyone", "contacts", "nobody"],
      default: "everyone",
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    },
  },
  { timestamps: true }
);

// Auto-expire index
statusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Status = mongoose.model("Status", statusSchema);
module.exports = Status;
