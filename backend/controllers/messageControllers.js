const asyncHandler = require("express-async-handler");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");
const path = require("path");

/**
 * Convert a display name into the "handle" used for @mentions
 * e.g. "John Doe" -> "JohnDoe"
 */
const toMentionHandle = (name = "") => name.replace(/\s+/g, "").toLowerCase();

/**
 * Scan message content for @handle tokens and resolve them against
 * the chat's members. Returns an array of matching User ObjectIds.
 */
const parseMentions = (content, chatUsers = []) => {
  if (!content) return [];
  const tokens = content.match(/@(\w+)/g) || [];
  if (!tokens.length) return [];

  const handles = new Set(tokens.map((t) => t.slice(1).toLowerCase()));
  const ids = new Set();

  chatUsers.forEach((u) => {
    if (handles.has(toMentionHandle(u.name))) {
      ids.add(u._id.toString());
    }
  });

  return Array.from(ids);
};

//@description     Get all Messages
//@route           GET /api/message/:chatId
//@access          Protected
const allMessages = asyncHandler(async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name pic email")
      .populate("mentions", "name pic email")
      .populate("chat");
    res.json(messages);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Create New Message
//@route           POST /api/message/
//@access          Protected
const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId } = req.body;

  if (!content || !chatId) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }

  try {
    // Load chat members so we can resolve @mentions against the group
    const chat = await Chat.findById(chatId).populate("users", "name pic email");
    if (!chat) {
      res.status(404);
      throw new Error("Chat not found");
    }

    const mentions = parseMentions(content, chat.users);

    let message = await Message.create({
      sender: req.user._id,
      content: content,
      chat: chatId,
      mentions,
    });

    message = await message.populate("sender", "name pic");
    message = await message.populate("mentions", "name pic email");
    message = await message.populate("chat");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name pic email",
    });
    await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });
    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Upload File & Create Message
//@route           POST /api/message/upload
//@access          Protected
const uploadFile = asyncHandler(async (req, res) => {
  const { chatId } = req.body;

  if (!req.file || !chatId) {
    res.status(400);
    throw new Error("File and chatId are required");
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  const fileName = req.file.originalname;
  const fileType = req.file.mimetype;

  const newMessage = {
    sender: req.user._id,
    content: "",
    chat: chatId,
    fileUrl,
    fileName,
    fileType,
  };

  try {
    let message = await Message.create(newMessage);
    message = await message.populate("sender", "name pic");
    message = await message.populate("chat");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name pic email",
    });
    await Chat.findByIdAndUpdate(chatId, { latestMessage: message });
    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Delete message for everyone
//@route           PUT /api/message/:messageId/delete
//@access          Protected
const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  try {
    const message = await Message.findById(messageId).populate("chat");
    if (!message) {
      res.status(404);
      throw new Error("Message not found");
    }

    // Only the sender can delete
    if (message.sender.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("You can only delete your own messages");
    }

    message.isDeleted = true;
    await message.save();

    // Populate sender for socket broadcast
    await message.populate("sender", "name pic");
    await message.populate("mentions", "name pic email");
    await message.populate("chat");
    await User.populate(message, { path: "chat.users", select: "name pic email" });

    res.json(message);
  } catch (error) {
    res.status(res.statusCode === 200 ? 400 : res.statusCode);
    throw new Error(error.message);
  }
});

module.exports = { allMessages, sendMessage, uploadFile, deleteMessage };
