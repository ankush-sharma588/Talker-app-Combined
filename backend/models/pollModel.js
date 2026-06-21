const mongoose = require("mongoose");

const pollOptionSchema = mongoose.Schema({
  text: { type: String, required: true, trim: true },
  voters: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

const pollSchema = mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    options: [pollOptionSchema],
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isMultipleChoice: { type: Boolean, default: false },
    isClosed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Poll = mongoose.model("Poll", pollSchema);
module.exports = Poll;
