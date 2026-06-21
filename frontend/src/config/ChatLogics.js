export const isSameSenderMargin = (messages, m, i, userId) => {
  // console.log(i === messages.length - 1);

  if (
    i < messages.length - 1 &&
    messages[i + 1].sender._id === m.sender._id &&
    messages[i].sender._id !== userId
  )
    return 33;
  else if (
    (i < messages.length - 1 &&
      messages[i + 1].sender._id !== m.sender._id &&
      messages[i].sender._id !== userId) ||
    (i === messages.length - 1 && messages[i].sender._id !== userId)
  )
    return 0;
  else return "auto";
};

export const isSameSender = (messages, m, i, userId) => {
  return (
    i < messages.length - 1 &&
    (messages[i + 1].sender._id !== m.sender._id ||
      messages[i + 1].sender._id === undefined) &&
    messages[i].sender._id !== userId
  );
};

export const isLastMessage = (messages, i, userId) => {
  return (
    i === messages.length - 1 &&
    messages[messages.length - 1].sender._id !== userId &&
    messages[messages.length - 1].sender._id
  );
};

export const isSameUser = (messages, m, i) => {
  return i > 0 && messages[i - 1].sender._id === m.sender._id;
};

export const getSender = (loggedUser, users) => {
  return users[0]?._id === loggedUser?._id ? users[1].name : users[0].name;
};

export const getSenderFull = (loggedUser, users) => {
  return users[0]._id === loggedUser._id ? users[1] : users[0];
};

// ── Mentions ────────────────────────────────────────────────────────────

/** Convert a display name into the "handle" used for @mentions, e.g. "John Doe" -> "JohnDoe" */
export const toMentionHandle = (name = "") => name.replace(/\s+/g, "");

/** Users that can be @mentioned in a chat (everyone except the logged-in user) */
export const getMentionableUsers = (loggedUser, users = []) => {
  return users.filter((u) => u._id !== loggedUser?._id);
};

/** Find the user object (if any) whose handle matches a given @token, e.g. "JohnDoe" */
export const findUserByHandle = (handle, users = []) => {
  if (!handle) return null;
  return (
    users.find(
      (u) => toMentionHandle(u.name).toLowerCase() === handle.toLowerCase()
    ) || null
  );
};

/** Regex used to find @handle tokens inside message text */
export const MENTION_REGEX = /@(\w+)/g;

/**
 * Split message text into segments of plain text and @mentions.
 * Each segment: { text, mention: User | null }
 */
export const splitMentions = (text = "", users = []) => {
  const segments = [];
  let lastIndex = 0;
  let match;
  const regex = new RegExp(MENTION_REGEX);
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), mention: null });
    }
    const mentionedUser = findUserByHandle(match[1], users);
    segments.push({ text: match[0], mention: mentionedUser });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), mention: null });
  }
  return segments;
};
