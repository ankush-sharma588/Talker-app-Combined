import {
  FormControl, Input, Box, Text, IconButton, Spinner,
  useToast, HStack, Tooltip, Image, Modal, ModalOverlay,
  ModalContent, ModalBody, ModalCloseButton, useDisclosure,
} from "@chakra-ui/react";
import "./styles.css";
import { getSender, getSenderFull, getMentionableUsers, toMentionHandle } from "../config/ChatLogics";
import { useEffect, useRef, useState, useCallback } from "react";
import api from "../config/api";
import { ArrowBackIcon, AttachmentIcon, SearchIcon } from "@chakra-ui/icons";
import ProfileModal from "./miscellaneous/ProfileModal";
import ScrollableChat from "./ScrollableChat";
import io from "socket.io-client";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal";
import { ChatState } from "../Context/ChatProvider";
import { useTheme } from "../Context/ThemeContext";
import TypingIndicator from "./TypingIndicator";
import ChatSearchBar from "./ChatSearchBar";
import EmojiPickerButton from "./EmojiPickerButton";
import ScreenShareModal, { IncomingShareBanner } from "./ScreenShareModal";
import CallModal, { IncomingCallPopup } from "./CallModal";
import GroupPollsDrawer from "./polls/GroupPollsDrawer";
import MentionSuggestions from "./MentionSuggestions";
import { SOCKET_URL } from "../config/env";

const ENDPOINT = SOCKET_URL;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages]           = useState([]);
  const [loading, setLoading]             = useState(false);
  const [newMessage, setNewMessage]       = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping]               = useState(false);
  const [istyping, setIsTyping]           = useState(false);
  const [typingSender, setTypingSender]   = useState(null);
  const [fileUploading, setFileUploading] = useState(false);
  const [previewUrl, setPreviewUrl]       = useState("");

  // search
  const [searchOpen, setSearchOpen]   = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchCount, setMatchCount]   = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);

  // ── Screen share state ──────────────────────────────────────────────────
  const [screenShareOpen, setScreenShareOpen] = useState(false);
  const [isSharer, setIsSharer]               = useState(false);
  const [remoteOffer, setRemoteOffer]         = useState(null);
  const [incomingShare, setIncomingShare]     = useState(null);

  // ── Voice/Video call state ──────────────────────────────────────────────
  const [callOpen, setCallOpen]           = useState(false);
  const [isCaller, setIsCaller]           = useState(false);
  const [isVideoCall, setIsVideoCall]     = useState(false);
  const [callRemoteOffer, setCallRemoteOffer] = useState(null);
  const [incomingCall, setIncomingCall]   = useState(null);

  // ── Group Polls state ────────────────────────────────────────────────────
  const [pollsOpen, setPollsOpen] = useState(false);

  // ── @Mention state ───────────────────────────────────────────────────────
  const [mentionActive, setMentionActive] = useState(false);
  const [mentionQuery, setMentionQuery]   = useState("");
  const [mentionStart, setMentionStart]   = useState(0);
  const [mentionIndex, setMentionIndex]   = useState(0);

  const { isOpen: isImgOpen, onOpen: onImgOpen, onClose: onImgClose } = useDisclosure();
  const toast               = useToast();
  const fileInputRef        = useRef(null);
  const messageInputRef     = useRef(null);
  const socketRef           = useRef(null);
  const selectedChatCompare = useRef(null);
  const { colors, chatBackgroundStyle, isCyberpunk } = useTheme();

  const { selectedChat, setSelectedChat, user, notification, setNotification } = ChatState();

  // search helpers
  const openSearch  = () => setSearchOpen(true);
  const closeSearch = () => { setSearchOpen(false); setSearchQuery(""); setMatchCount(0); setCurrentMatch(0); };
  useEffect(() => { setCurrentMatch(0); }, [searchQuery, messages]);
  useEffect(() => { if (!searchQuery) setMatchCount(0); }, [searchQuery]);
  const handleMatchCountChange = useCallback((count) => { setMatchCount(count); }, []);
  const goNext = () => { if (matchCount === 0) return; setCurrentMatch((p) => (p + 1) % matchCount); };
  const goPrev = () => { if (matchCount === 0) return; setCurrentMatch((p) => (p - 1 + matchCount) % matchCount); };
  useEffect(() => {
    const h = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === "f") { e.preventDefault(); setSearchOpen((p) => !p); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  useEffect(() => { closeSearch(); setMentionActive(false); /* eslint-disable-next-line */ }, [selectedChat?._id]);

  // fetch / send
  const fetchMessages = async () => {
    if (!selectedChat) return;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      setLoading(true);
      const { data } = await api.get(`/api/message/${selectedChat._id}`, config);
      setMessages(data);
      setLoading(false);
      socketRef.current.emit("join chat", selectedChat._id);
    } catch {
      toast({ title: "Failed to load messages", status: "error", duration: 3000, position: "top" });
      setLoading(false);
    }
  };

  const sendMessage = async (event) => {
    if (event.key === "Enter" && newMessage.trim()) {
      socketRef.current.emit("stop typing", selectedChat._id);
      try {
        const config = { headers: { "Content-type": "application/json", Authorization: `Bearer ${user.token}` } };
        const text = newMessage;
        setNewMessage("");
        const { data } = await api.post("/api/message", { content: text, chatId: selectedChat._id }, config);
        socketRef.current.emit("new message", data);
        setMessages((prev) => [...prev, data]);
      } catch {
        toast({ title: "Failed to send message", status: "error", duration: 3000, position: "top" });
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Max 10 MB per file", status: "warning", duration: 3000, position: "top" });
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("chatId", selectedChat._id);
    try {
      setFileUploading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await api.post("/api/message/upload", formData, config);
      socketRef.current.emit("new message", data);
      setMessages((prev) => [...prev, data]);
      setFetchAgain((f) => !f);
    } catch (err) {
      toast({ title: "Upload failed", description: err.response?.data?.message || err.message, status: "error", duration: 3000, position: "top" });
    }
    setFileUploading(false);
    e.target.value = "";
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await api.put(`/api/message/${messageId}/delete`, {}, config);
      setMessages((prev) => prev.map((m) => (m._id === data._id ? { ...m, isDeleted: true } : m)));
      socketRef.current.emit("message deleted", data);
    } catch (err) {
      toast({ title: "Could not delete message", description: err.response?.data?.message || "Something went wrong", status: "error", duration: 3000, position: "top" });
    }
  };

  const handleEmojiSelect = (newValue) => {
    setNewMessage(newValue);
    if (!socketConnected) return;
    if (!typing) { setTyping(true); socketRef.current.emit("typing", selectedChat._id); }
  };

  // ── Socket setup ────────────────────────────────────────────────────────
  useEffect(() => {
    socketRef.current = io(ENDPOINT, {
      transports: ["websocket", "polling"], // prefer websocket; mobile carrier/proxy networks handle long-polling poorly
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // Free-tier hosts (e.g. Render's free plan) spin down an idle backend
      // and can take 30-50s to wake on the next request. socket.io-client's
      // 20s default connection timeout would fail and force an extra retry
      // cycle on the very first connection after idle; 30s comfortably
      // covers a cold start without making a genuinely-down backend hang
      // for too long before the UI can show a connection problem.
      timeout: 30000,
    });
    socketRef.current.emit("setup", user);
    socketRef.current.on("connected", () => setSocketConnected(true));
    socketRef.current.on("typing",    () => setIsTyping(true));
    socketRef.current.on("stop typing", () => setIsTyping(false));

    // incoming screen share offer
    socketRef.current.on("screen-share-offer", ({ offer, from, fromName }) => {
      setIncomingShare({ offer, from, fromName });
    });

    // incoming voice/video call offer
    socketRef.current.on("call-offer", ({ offer, from, fromName, fromPic, isVideo }) => {
      setIncomingCall({ offer, from, fromName, fromPic, isVideo });
    });

    // ── @mention notification ──────────────────────────────────────────
    socketRef.current.on("user mentioned", ({ message, chat, from }) => {
      const isActiveChat = selectedChatCompare.current && selectedChatCompare.current._id === chat._id;
      toast({
        title: `${from?.name || "Someone"} mentioned you`,
        description: chat.isGroupChat ? `in ${chat.chatName}` : undefined,
        status: "info",
        duration: 4000,
        position: "top-right",
        isClosable: true,
        icon: <Text>@</Text>,
      });
      if (!isActiveChat) {
        setNotification((prev) =>
          prev.find((n) => n._id === message._id) ? prev : [{ ...message, isMention: true }, ...prev]
        );
        setFetchAgain((f) => !f);
      }
    });

    return () => { socketRef.current.disconnect(); };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    fetchMessages();
    selectedChatCompare.current = selectedChat;
    // eslint-disable-next-line
  }, [selectedChat]);

  useEffect(() => {
    if (!socketRef.current) return;
    const handleMsg = (newMessageRecieved) => {
      if (!selectedChatCompare.current || selectedChatCompare.current._id !== newMessageRecieved.chat._id) {
        const isMentioned = newMessageRecieved.mentions?.some((m) => m._id === user._id);
        // Mentions get their own richer notification via "user mentioned"; avoid duplicates
        if (!isMentioned) {
          setNotification((prev) => prev.find((n) => n._id === newMessageRecieved._id) ? prev : [newMessageRecieved, ...prev]);
        }
        setFetchAgain((f) => !f);
      } else {
        setMessages((prev) => [...prev, newMessageRecieved]);
      }
    };
    const handleDel = (deletedMessage) => {
      if (selectedChatCompare.current && selectedChatCompare.current._id === deletedMessage.chat._id) {
        setMessages((prev) => prev.map((m) => (m._id === deletedMessage._id ? { ...m, isDeleted: true } : m)));
      }
    };
    socketRef.current.on("message recieved", handleMsg);
    socketRef.current.on("message deleted",  handleDel);
    return () => {
      socketRef.current.off("message recieved", handleMsg);
      socketRef.current.off("message deleted",  handleDel);
    };
  });

  const typingHandler = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    if (socketConnected) {
      if (!typing) { setTyping(true); socketRef.current.emit("typing", selectedChat._id); }
      const lastTypingTime = Date.now();
      setTimeout(() => {
        if (Date.now() - lastTypingTime >= 3000 && typing) {
          socketRef.current.emit("stop typing", selectedChat._id);
          setTyping(false);
        }
      }, 3000);
    }
    updateMentionState(value, e.target.selectionStart);
  };

  // ── @Mention helpers ──────────────────────────────────────────────────────
  const mentionableUsers = selectedChat ? getMentionableUsers(user, selectedChat.users) : [];

  const mentionSuggestions = mentionActive
    ? mentionableUsers
        .filter((u) =>
          toMentionHandle(u.name).toLowerCase().startsWith(mentionQuery.toLowerCase())
        )
        .slice(0, 6)
    : [];

  /** Look at the text up to the cursor; if it ends with "@partial", open suggestions */
  const updateMentionState = (value, cursorPos) => {
    const upToCursor = value.slice(0, cursorPos ?? value.length);
    const match = upToCursor.match(/@(\w*)$/);
    if (match) {
      setMentionActive(true);
      setMentionQuery(match[1]);
      setMentionStart(upToCursor.length - match[0].length);
      setMentionIndex(0);
    } else {
      setMentionActive(false);
      setMentionQuery("");
    }
  };

  /** Insert "@Handle " into the message in place of the partial "@query" */
  const selectMention = (mentionedUser) => {
    const handle = toMentionHandle(mentionedUser.name);
    const before = newMessage.slice(0, mentionStart);
    const after = newMessage.slice(mentionStart + 1 + mentionQuery.length);
    const updated = `${before}@${handle} ${after}`;
    setNewMessage(updated);
    setMentionActive(false);
    setMentionQuery("");
    if (!socketConnected) return;
    if (!typing) { setTyping(true); socketRef.current.emit("typing", selectedChat._id); }
    requestAnimationFrame(() => messageInputRef.current?.focus());
  };

  /** Keyboard handler for the message input: mention nav takes priority */
  const handleInputKeyDown = (e) => {
    if (mentionActive && mentionSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionSuggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + mentionSuggestions.length) % mentionSuggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectMention(mentionSuggestions[Math.min(mentionIndex, mentionSuggestions.length - 1)]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionActive(false);
        return;
      }
    }
    sendMessage(e);
  };

  const otherUser = selectedChat && !selectedChat.isGroupChat
    ? getSenderFull(user, selectedChat.users)
    : null;

  // open screen share as sharer
  const openScreenShare = () => {
    setIsSharer(true);
    setRemoteOffer(null);
    setScreenShareOpen(true);
  };

  // open a voice/video call as the caller
  const openCall = (video) => {
    setIsCaller(true);
    setIsVideoCall(video);
    setCallRemoteOffer(null);
    setCallOpen(true);
  };

  return (
    <Box display="flex" flexDir="column" w="100%" h="100%" overflow="hidden">
      {selectedChat ? (
        <Box display="flex" flexDir="column" w="100%" h="100%" overflow="hidden">
          <Text
            pb={2} px={3} w="100%"
            fontFamily={isCyberpunk ? "'Orbitron', monospace" : "Work sans"}
            fontWeight="600"
            fontSize={{ base: "20px", md: isCyberpunk ? "18px" : "22px" }}
            display="flex" justifyContent="space-between" alignItems="center"
            color={isCyberpunk ? "#e8d5ff" : colors.text}
            bg={colors.header}
            borderBottom={isCyberpunk ? "1px solid #b84bff44" : `1px solid ${colors.border}`}
            transition="background 0.3s"
            position="relative"
            boxShadow={isCyberpunk ? "0 2px 16px #b84bff22" : undefined}
          >
            {isCyberpunk && (
              <Box
                position="absolute"
                bottom="0" left="0" right="0"
                h="1px"
                className="cyber-header-line"
              />
            )}
            <IconButton
              display={{ base: "flex", md: "none" }}
              icon={<ArrowBackIcon />}
              onClick={() => setSelectedChat("")}
              variant="ghost" color={colors.text} size="sm"
            />
            {messages && (!selectedChat.isGroupChat ? (
              <>
                <Box display="flex" alignItems="center" gap={2} flex={1} pl={{ base: 2, md: 0 }}>
                  <Text fontWeight="600">{getSender(user, selectedChat.users)}</Text>
                  {otherUser?.about && (
                    <Text fontSize="xs" color={colors.subText} fontWeight="400">
                      · {otherUser.about}
                    </Text>
                  )}
                </Box>
                <HStack spacing={1}>
                  {/* 📞 Voice call button */}
                  <Tooltip label="Voice Call" hasArrow>
                    <IconButton
                      icon={<Text fontSize="16px">📞</Text>}
                      size="sm" variant="ghost"
                      color={colors.subText}
                      _hover={{ color: colors.accent, bg: colors.accentDim }}
                      onClick={() => openCall(false)}
                      aria-label="Start voice call"
                    />
                  </Tooltip>
                  {/* 🎥 Video call button */}
                  <Tooltip label="Video Call" hasArrow>
                    <IconButton
                      icon={<Text fontSize="16px">🎥</Text>}
                      size="sm" variant="ghost"
                      color={colors.subText}
                      _hover={{ color: colors.accent, bg: colors.accentDim }}
                      onClick={() => openCall(true)}
                      aria-label="Start video call"
                    />
                  </Tooltip>
                  {/* 🖥️ Screen Share button — only for 1-to-1 */}
                  <Tooltip label="Share Screen" hasArrow>
                    <IconButton
                      icon={<Text fontSize="16px">🖥️</Text>}
                      size="sm" variant="ghost"
                      color={colors.subText}
                      _hover={{ color: colors.accent, bg: colors.accentDim }}
                      onClick={openScreenShare}
                      aria-label="Share screen"
                    />
                  </Tooltip>
                  <Tooltip label="Search in chat (Ctrl+F)" hasArrow>
                    <IconButton
                      icon={<SearchIcon />} size="sm"
                      variant={searchOpen ? "solid" : "ghost"}
                      colorScheme={searchOpen ? "purple" : undefined}
                      color={searchOpen ? undefined : colors.subText}
                      bg={searchOpen ? colors.accent : undefined}
                      _hover={{ color: colors.accent, bg: colors.accentDim }}
                      onClick={searchOpen ? closeSearch : openSearch}
                      aria-label="Search messages"
                    />
                  </Tooltip>
                  <ProfileModal user={getSenderFull(user, selectedChat.users)} />
                </HStack>
              </>
            ) : (
              <>
                <Text flex={1} pl={{ base: 2, md: 0 }}>{selectedChat.chatName.toUpperCase()}</Text>
                <HStack spacing={1}>
                  <Tooltip label="Search in chat (Ctrl+F)" hasArrow>
                    <IconButton
                      icon={<SearchIcon />} size="sm"
                      variant={searchOpen ? "solid" : "ghost"}
                      colorScheme={searchOpen ? "purple" : undefined}
                      color={searchOpen ? undefined : colors.subText}
                      bg={searchOpen ? colors.accent : undefined}
                      _hover={{ color: colors.accent, bg: colors.accentDim }}
                      onClick={searchOpen ? closeSearch : openSearch}
                      aria-label="Search messages"
                    />
                  </Tooltip>
                  <Tooltip label="Group Polls" hasArrow>
                    <IconButton
                      icon={<Text fontSize="14px">📊</Text>} size="sm"
                      variant={pollsOpen ? "solid" : "ghost"}
                      bg={pollsOpen ? colors.accent : undefined}
                      color={pollsOpen ? "white" : colors.subText}
                      _hover={{ color: colors.accent, bg: colors.accentDim }}
                      onClick={() => setPollsOpen((p) => !p)}
                      aria-label="Group Polls"
                    />
                  </Tooltip>
                  <UpdateGroupChatModal fetchMessages={fetchMessages} fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
                </HStack>
              </>
            ))}
          </Text>

          {/* search bar */}
          {searchOpen && (
            <ChatSearchBar
              query={searchQuery} setQuery={setSearchQuery}
              matchCount={matchCount} currentMatch={currentMatch}
              onNext={goNext} onPrev={goPrev} onClose={closeSearch}
            />
          )}

          {/* messages */}
          <Box
            display="flex" flexDir="column" justifyContent="flex-end"
            p={3} w="100%" flex="1 1 auto" minHeight={0}
            borderRadius="lg" overflowY="hidden"
            transition="background 0.3s" style={chatBackgroundStyle}
          >
            {loading ? (
              <Spinner size="xl" w={16} h={16} alignSelf="center" margin="auto" color={colors.accent} />
            ) : (
              <div className="messages">
                <ScrollableChat
                  messages={messages}
                  onImageClick={(url) => { setPreviewUrl(url); onImgOpen(); }}
                  searchQuery={searchQuery}
                  currentMatchIndex={currentMatch}
                  onMatchCountChange={handleMatchCountChange}
                  onDeleteMessage={handleDeleteMessage}
                />
              </div>
            )}

            {istyping && <TypingIndicator senderName={otherUser?.name} senderPic={otherUser?.pic} />}

            {/* input row */}
            <FormControl id="message-input" isRequired mt={3}>
              <Box position="relative">
                {mentionActive && (
                  <MentionSuggestions
                    users={mentionSuggestions}
                    activeIndex={mentionIndex}
                    onSelect={selectMention}
                    isCyberpunk={isCyberpunk}
                  />
                )}
                <HStack spacing={2}>
                  <input type="file" ref={fileInputRef} style={{ display: "none" }}
                    onChange={handleFileUpload}
                    accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip,.rar" />
                  <Tooltip label="Attach file" hasArrow>
                    <IconButton
                      icon={fileUploading ? <Spinner size="sm" color={colors.accent} /> : <AttachmentIcon />}
                      onClick={() => fileInputRef.current.click()}
                      isDisabled={fileUploading} variant="ghost"
                      color={colors.subText} _hover={{ color: colors.accent, bg: colors.accentDim }}
                      aria-label="Upload file" size="sm"
                    />
                  </Tooltip>
                  <EmojiPickerButton onEmojiSelect={handleEmojiSelect} inputRef={messageInputRef} />
                  <Input
                    ref={messageInputRef} variant="filled"
                    bg={colors.inputBg} color={colors.text}
                    placeholder="Type a message… (use @ to mention, Enter to send)"
                    _placeholder={{ color: colors.subText }}
                    _focus={{ bg: colors.inputBg, borderColor: colors.accent, boxShadow: `0 0 0 1px ${colors.accent}` }}
                    _hover={{ bg: colors.inputBg }}
                    value={newMessage} onChange={typingHandler} onKeyDown={handleInputKeyDown}
                    onBlur={() => setTimeout(() => setMentionActive(false), 100)}
                    flex={1} borderRadius="xl"
                  />
                </HStack>
              </Box>
            </FormControl>
          </Box>
        </Box>
      ) : (
        <Box display="flex" alignItems="center" justifyContent="center" h="100%" flexDir="column" gap={3} style={chatBackgroundStyle}>
          <Text fontSize="4xl">💬</Text>
          <Text fontSize="xl" fontFamily="Work sans" color={colors.subText}>
            Select a chat to start messaging
          </Text>
        </Box>
      )}

      {/* image preview modal */}
      <Modal isOpen={isImgOpen} onClose={onImgClose} size="xl" isCentered>
        <ModalOverlay backdropFilter="blur(6px)" />
        <ModalContent bg="transparent" shadow="none" maxW="90vw">
          <ModalCloseButton color="white" zIndex={10} bg="blackAlpha.600" borderRadius="full" />
          <ModalBody p={0} display="flex" justifyContent="center">
            <Image src={previewUrl} maxW="100%" maxH="85vh" borderRadius="md" />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* ── Screen Share overlay ── */}
      {screenShareOpen && (
        <ScreenShareModal
          isOpen={screenShareOpen}
          onClose={() => { setScreenShareOpen(false); setRemoteOffer(null); setIsSharer(false); }}
          socket={socketRef.current}
          user={user}
          otherUser={
            isSharer
              ? otherUser
              : incomingShare
                ? { _id: incomingShare.from, name: incomingShare.fromName }
                : otherUser
          }
          isSharer={isSharer}
          remoteOffer={remoteOffer}
        />
      )}

      {/* ── Call overlay ── */}
      {callOpen && (
        <CallModal
          isOpen={callOpen}
          onClose={() => {
            setCallOpen(false);
            setCallRemoteOffer(null);
            setIsCaller(false);
          }}
          socket={socketRef.current}
          user={user}
          otherUser={
            isCaller
              ? otherUser
              : incomingCall
                ? { _id: incomingCall.from, name: incomingCall.fromName, pic: incomingCall.fromPic }
                : otherUser
          }
          isCaller={isCaller}
          isVideoCall={isVideoCall}
          remoteOffer={callRemoteOffer}
        />
      )}

      {/* ── Group Polls Drawer ── */}
      {selectedChat?.isGroupChat && (
        <GroupPollsDrawer
          isOpen={pollsOpen}
          onClose={() => setPollsOpen(false)}
          socket={socketRef.current}
        />
      )}

      {/* ── Incoming share request banner ── */}
      {incomingShare && !screenShareOpen && (
        <IncomingShareBanner
          fromName={incomingShare.fromName}
          colors={colors}
          onAccept={() => {
            setIsSharer(false);
            setRemoteOffer(incomingShare.offer);
            setScreenShareOpen(true);
            setIncomingShare(null);
          }}
          onReject={() => setIncomingShare(null)}
        />
      )}

      {/* ── Incoming call popup ── */}
      {incomingCall && !callOpen && (
        <IncomingCallPopup
          fromName={incomingCall.fromName}
          fromPic={incomingCall.fromPic}
          isVideo={incomingCall.isVideo}
          colors={colors}
          onAccept={() => {
            setIsCaller(false);
            setIsVideoCall(incomingCall.isVideo);
            setCallRemoteOffer(incomingCall.offer);
            setCallOpen(true);
            setIncomingCall(null);
          }}
          onReject={() => {
            socketRef.current.emit("call-reject", { to: incomingCall.from });
            setIncomingCall(null);
          }}
        />
      )}
    </Box>
  );
};

export default SingleChat;
