const asyncHandler = require("express-async-handler");
const Poll = require("../models/pollModel");
const Chat = require("../models/chatModel");

// @desc  Create a poll in a group chat
// @route POST /api/poll
const createPoll = asyncHandler(async (req, res) => {
  const { chatId, question, options, isMultipleChoice } = req.body;

  if (!chatId || !question || !options || options.length < 2) {
    return res.status(400).json({ message: "Provide chatId, question, and at least 2 options" });
  }

  const chat = await Chat.findById(chatId);
  if (!chat) return res.status(404).json({ message: "Chat not found" });
  if (!chat.isGroupChat) return res.status(400).json({ message: "Polls are only available in group chats" });

  const poll = await Poll.create({
    question,
    options: options.map((text) => ({ text, voters: [] })),
    chat: chatId,
    createdBy: req.user._id,
    isMultipleChoice: !!isMultipleChoice,
  });

  const populated = await Poll.findById(poll._id)
    .populate("createdBy", "name pic")
    .populate("options.voters", "name pic");

  res.status(201).json(populated);
});

// @desc  Get all polls for a chat
// @route GET /api/poll/:chatId
const getPollsByChat = asyncHandler(async (req, res) => {
  const polls = await Poll.find({ chat: req.params.chatId })
    .populate("createdBy", "name pic")
    .populate("options.voters", "name pic")
    .sort({ createdAt: -1 });

  res.json(polls);
});

// @desc  Vote on a poll
// @route PUT /api/poll/:pollId/vote
const votePoll = asyncHandler(async (req, res) => {
  const { optionIndexes } = req.body; // array of option indexes
  const userId = req.user._id;

  if (!optionIndexes || !Array.isArray(optionIndexes) || optionIndexes.length === 0) {
    return res.status(400).json({ message: "Provide optionIndexes array" });
  }

  const poll = await Poll.findById(req.params.pollId);
  if (!poll) return res.status(404).json({ message: "Poll not found" });
  if (poll.isClosed) return res.status(400).json({ message: "Poll is closed" });

  // Remove previous votes by this user
  poll.options.forEach((opt) => {
    opt.voters = opt.voters.filter((v) => v.toString() !== userId.toString());
  });

  // Add new votes
  const indexes = poll.isMultipleChoice ? optionIndexes : [optionIndexes[0]];
  indexes.forEach((idx) => {
    if (poll.options[idx]) {
      poll.options[idx].voters.push(userId);
    }
  });

  await poll.save();

  const populated = await Poll.findById(poll._id)
    .populate("createdBy", "name pic")
    .populate("options.voters", "name pic");

  res.json(populated);
});

// @desc  Close a poll
// @route PUT /api/poll/:pollId/close
const closePoll = asyncHandler(async (req, res) => {
  const poll = await Poll.findById(req.params.pollId);
  if (!poll) return res.status(404).json({ message: "Poll not found" });
  if (poll.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Only the poll creator can close it" });
  }

  poll.isClosed = true;
  await poll.save();

  const populated = await Poll.findById(poll._id)
    .populate("createdBy", "name pic")
    .populate("options.voters", "name pic");

  res.json(populated);
});

// @desc  Delete a poll
// @route DELETE /api/poll/:pollId
const deletePoll = asyncHandler(async (req, res) => {
  const poll = await Poll.findById(req.params.pollId);
  if (!poll) return res.status(404).json({ message: "Poll not found" });
  if (poll.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Only the poll creator can delete it" });
  }

  await poll.deleteOne();
  res.json({ message: "Poll deleted" });
});

module.exports = { createPoll, getPollsByChat, votePoll, closePoll, deletePoll };
