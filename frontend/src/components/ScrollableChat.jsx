import { Avatar, Box, Image, Text, Link, IconButton, Menu, MenuButton, MenuList, MenuItem, Portal } from "@chakra-ui/react";
import { Tooltip } from "@chakra-ui/react";
import { useEffect, useRef, useCallback, useState } from "react";
import {
  isLastMessage, isSameSender, isSameSenderMargin, isSameUser, splitMentions,
} from "../config/ChatLogics";
import { ChatState } from "../Context/ChatProvider";
import { useTheme } from "../Context/ThemeContext";
import { DeleteIcon } from "@chakra-ui/icons";

/** Split `text` by `query` (case-insensitive) and return an array of
 *  { part, isMatch } objects for rendering highlighted spans.
 */
const highlightText = (text, query, globalMatchIndex, currentMatchIndex) => {
  if (!query || !text) return [{ part: text, isMatch: false, matchIdx: -1 }];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  let mi = globalMatchIndex;
  return parts.map((part) => {
    if (regex.test(part)) {
      regex.lastIndex = 0;
      const idx = mi++;
      return { part, isMatch: true, matchIdx: idx };
    }
    regex.lastIndex = 0;
    return { part, isMatch: false, matchIdx: -1 };
  });
};

/** Count how many times `query` appears (case-insensitive) in `text`. */
const countMatches = (text, query) => {
  if (!query || !text) return 0;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (text.match(new RegExp(escaped, "gi")) || []).length;
};

const ScrollableChat = ({
  messages,
  onImageClick,
  searchQuery = "",
  currentMatchIndex = 0,
  onMatchCountChange,
  onDeleteMessage,
}) => {
  const { user, selectedChat } = ChatState();
  const { colors, isCyberpunk } = useTheme();
  const bottomRef = useRef(null);
  const matchRefs = useRef([]);

  // Context menu state
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, messageId: null });

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const matchesPerMessage = useCallback(() => {
    if (!messages) return [];
    return messages.map((m) =>
      !m.isDeleted && m.content ? countMatches(m.content, searchQuery) : 0
    );
  }, [messages, searchQuery]);

  useEffect(() => {
    if (!onMatchCountChange) return;
    const total = matchesPerMessage().reduce((a, b) => a + b, 0);
    onMatchCountChange(total);
  }, [matchesPerMessage, onMatchCountChange]);

  useEffect(() => {
    if (searchQuery && matchRefs.current[currentMatchIndex]) {
      matchRefs.current[currentMatchIndex].scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (!searchQuery) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentMatchIndex, searchQuery]);

  useEffect(() => {
    if (!searchQuery) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, searchQuery]);

  matchRefs.current = [];

  // Close context menu on outside click
  useEffect(() => {
    const close = () => setContextMenu((c) => ({ ...c, visible: false }));
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const handleRightClick = (e, messageId, isOwn, isDeleted) => {
    if (!isOwn || isDeleted) return;
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, messageId });
  };

  const handleDeleteClick = () => {
    if (contextMenu.messageId && onDeleteMessage) {
      onDeleteMessage(contextMenu.messageId);
    }
    setContextMenu((c) => ({ ...c, visible: false }));
  };

  const renderTextWithHighlights = (m, globalMatchStart) => {
    if (!m.content) {
      return (
        <Text fontSize="sm" lineHeight="1.5" wordBreak="break-word">
          {m.content}
        </Text>
      );
    }

    const chatUsers = selectedChat?.users || [];
    const segments = splitMentions(m.content, chatUsers);

    // Running counter so search-match indices stay correct across segments
    let runningMatchIdx = globalMatchStart;

    return (
      <Text fontSize="sm" lineHeight="1.5" wordBreak="break-word">
        {segments.map((seg, segIdx) => {
          // ── @mention segment ──────────────────────────────────────────
          if (seg.mention) {
            const isMe = seg.mention._id === user._id;
            return (
              <Box
                as="span"
                key={segIdx}
                fontWeight="700"
                borderRadius="4px"
                px="3px"
                bg={isMe ? colors.accent : `${colors.accent}26`}
                color={isMe ? "white" : colors.accent}
              >
                {seg.text}
              </Box>
            );
          }

          // ── plain text segment (with optional search highlighting) ─────
          if (!searchQuery) {
            return <span key={segIdx}>{seg.text}</span>;
          }

          const parts = highlightText(seg.text, searchQuery, runningMatchIdx, currentMatchIndex);
          runningMatchIdx += parts.filter((p) => p.isMatch).length;

          return parts.map((p, pIdx) => {
            if (!p.isMatch) return <span key={`${segIdx}-${pIdx}`}>{p.part}</span>;
            const isCurrent = p.matchIdx === currentMatchIndex;
            return (
              <Box
                key={`${segIdx}-${pIdx}`}
                as="mark"
                ref={(el) => { if (el) matchRefs.current[p.matchIdx] = el; }}
                bg={isCurrent ? colors.accent : `${colors.accent}55`}
                color={isCurrent ? "white" : colors.text}
                borderRadius="3px"
                px="1px"
                outline={isCurrent ? `2px solid ${colors.accent}` : "none"}
                outlineOffset="1px"
                transition="all 0.15s"
              >
                {p.part}
              </Box>
            );
          });
        })}
      </Text>
    );
  };

  /** Render deleted message placeholder */
  const renderDeletedContent = (isOwn) => (
    <Box display="flex" alignItems="center" gap={1.5}>
      <DeleteIcon boxSize={3} opacity={0.5} />
      <Text fontSize="sm" fontStyle="italic" opacity={0.6}>
        This message was deleted
      </Text>
    </Box>
  );

  const renderContent = (m, isOwn, globalMatchStart) => {
    // Deleted message — always show placeholder regardless of content type
    if (m.isDeleted) {
      return (
        <Box>
          {renderDeletedContent(isOwn)}
          <Text fontSize="10px" mt={0.5} opacity={0.5} textAlign="right">
            {formatTime(m.createdAt)}
          </Text>
        </Box>
      );
    }

    if (m.fileUrl) {
      const isImage = m.fileType?.startsWith("image/");
      const isVideo = m.fileType?.startsWith("video/");

      if (isImage) {
        return (
          <Box>
            <Image
              src={m.fileUrl}
              alt={m.fileName || "image"}
              maxW="220px"
              borderRadius="10px"
              cursor="pointer"
              onClick={() => onImageClick?.(m.fileUrl)}
              _hover={{ opacity: 0.88, transform: "scale(1.01)" }}
              transition="all 0.15s"
            />
            <Text fontSize="10px" mt={1} opacity={0.6} textAlign="right">{formatTime(m.createdAt)}</Text>
          </Box>
        );
      }
      if (isVideo) {
        return (
          <Box>
            <video src={m.fileUrl} controls style={{ maxWidth: "220px", borderRadius: "10px" }} />
            <Text fontSize="10px" mt={1} opacity={0.6} textAlign="right">{formatTime(m.createdAt)}</Text>
          </Box>
        );
      }
      return (
        <Box>
          <Link href={m.fileUrl} isExternal _hover={{ textDecoration: "none" }}>
            <Box
              display="flex" alignItems="center" gap={2} px={3} py={2}
              borderRadius="10px" bg={isOwn ? "rgba(255,255,255,0.15)" : colors.chatItem}
              border={`1px solid ${colors.border}`} cursor="pointer"
              _hover={{ opacity: 0.8 }} transition="opacity 0.15s"
            >
              <Text fontSize="xl">📎</Text>
              <Box>
                <Text fontSize="xs" fontWeight="600" color={isOwn ? "white" : colors.text} noOfLines={1} maxW="160px">
                  {m.fileName || "File"}
                </Text>
                <Text fontSize="10px" color={isOwn ? "rgba(255,255,255,0.7)" : colors.subText}>
                  Click to download
                </Text>
              </Box>
            </Box>
          </Link>
          <Text fontSize="10px" mt={1} opacity={0.6} textAlign="right" color={isOwn ? "white" : colors.text}>
            {formatTime(m.createdAt)}
          </Text>
        </Box>
      );
    }

    return (
      <Box>
        {renderTextWithHighlights(m, globalMatchStart)}
        <Text fontSize="10px" mt={0.5} opacity={0.6} textAlign="right">
          {formatTime(m.createdAt)}
        </Text>
      </Box>
    );
  };

  const cumulative = matchesPerMessage().reduce((acc, count) => {
    acc.push((acc[acc.length - 1] ?? 0) + count);
    return acc;
  }, []);

  return (
    <Box pb={2}>
      {messages?.map((m, i) => {
        const isOwn = m.sender._id === user._id;
        const showAvatar = isSameSender(messages, m, i, user._id) || isLastMessage(messages, i, user._id);
        const globalMatchStart = i === 0 ? 0 : cumulative[i - 1];
        const mentionsMe = !isOwn && !m.isDeleted && m.mentions?.some((mn) => mn._id === user._id);
        return (
          <Box
            key={m._id}
            display="flex"
            justifyContent={isOwn ? "flex-end" : "flex-start"}
            mb={isSameUser(messages, m, i) ? "3px" : "8px"}
          >
            {/* Other user avatar */}
            {!isOwn && (
              <Box w="28px" mr={1} flexShrink={0} alignSelf="flex-end">
                {showAvatar && (
                  <Tooltip label={m.sender.name} placement="left" hasArrow>
                    <Avatar size="xs" name={m.sender.name} src={m.sender.pic} cursor="pointer" />
                  </Tooltip>
                )}
              </Box>
            )}

            <Box maxW="72%">
              {!isOwn && showAvatar && (
                <Text fontSize="10px" fontWeight="600" color={colors.accent} mb={0.5} ml={1}>
                  {m.sender.name}
                </Text>
              )}

              <Box
                px={m.fileUrl && !m.isDeleted ? 2 : 3}
                py={2}
                borderRadius={isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px"}
                bg={mentionsMe
                  ? colors.accentDim
                  : isCyberpunk
                    ? (isOwn ? undefined : colors.otherMessage)
                    : (isOwn ? colors.myMessage : colors.otherMessage)}
                style={isCyberpunk && isOwn ? {
                  background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
                } : undefined}
                color={isOwn ? "white" : colors.text}
                border={isCyberpunk
                  ? (isOwn ? "none" : mentionsMe ? `1px solid ${colors.accent}` : "1px solid #b84bff33")
                  : (isOwn ? "none" : mentionsMe ? `1px solid ${colors.accent}` : `1px solid ${colors.border}`)}
                boxShadow={mentionsMe
                  ? `0 0 0 1px ${colors.accent}55, 0 0 12px ${colors.accent}33`
                  : isCyberpunk
                    ? (isOwn ? "0 0 12px #7c3aed66, 0 0 24px #3b82f633" : "0 0 8px #b84bff22")
                    : "0 1px 2px rgba(0,0,0,0.1)"}
                transition="background 0.3s"
                onContextMenu={(e) => handleRightClick(e, m._id, isOwn, m.isDeleted)}
                cursor={isOwn && !m.isDeleted ? "context-menu" : "default"}
                _hover={isOwn && !m.isDeleted ? { opacity: 0.95 } : {}}
                position="relative"
                className={isCyberpunk ? (isOwn ? "cyber-message-mine" : "cyber-message-other") : ""}
              >
                {renderContent(m, isOwn, globalMatchStart)}
              </Box>

              {/* Hint for own non-deleted messages */}
              {isOwn && !m.isDeleted && (
                <Text fontSize="9px" opacity={0.4} textAlign="right" mt="1px" mr={1}>
                  right-click to delete
                </Text>
              )}
            </Box>
          </Box>
        );
      })}
      <div ref={bottomRef} />

      {/* Custom context menu */}
      {contextMenu.visible && (
        <Box
          position="fixed"
          top={contextMenu.y}
          left={contextMenu.x}
          zIndex={9999}
          bg={colors.chatItem || "white"}
          border={`1px solid ${colors.border}`}
          borderRadius="md"
          boxShadow="lg"
          py={1}
          minW="160px"
          onClick={(e) => e.stopPropagation()}
        >
          <Box
            px={3} py={2}
            display="flex"
            alignItems="center"
            gap={2}
            cursor="pointer"
            color="red.400"
            _hover={{ bg: "red.50" }}
            onClick={handleDeleteClick}
            borderRadius="sm"
            transition="background 0.15s"
          >
            <DeleteIcon boxSize={3.5} />
            <Text fontSize="sm" fontWeight="500">Delete for everyone</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ScrollableChat;
