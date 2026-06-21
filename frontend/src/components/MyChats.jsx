import { AddIcon, DeleteIcon } from "@chakra-ui/icons";
import {
  Box, Stack, Text, Button, useToast, Avatar, HStack, VStack, IconButton,
  AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader,
  AlertDialogContent, AlertDialogOverlay, useDisclosure,
} from "@chakra-ui/react";
import api from "../config/api";
import { useEffect, useState, useRef } from "react";
import { getSender, getSenderFull } from "../config/ChatLogics";
import ChatLoading from "./ChatLoading";
import GroupChatModal from "./miscellaneous/GroupChatModal";
import { ChatState } from "../Context/ChatProvider";
import { useTheme } from "../Context/ThemeContext";
import StatusBar from "./status/StatusBar";

const MyChats = ({ fetchAgain }) => {
  const [loggedUser, setLoggedUser] = useState();
  const [chatToDelete, setChatToDelete] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef();

  const { selectedChat, setSelectedChat, user, chats, setChats } = ChatState();
  const { colors, isCyberpunk } = useTheme();
  const toast = useToast();

  const fetchChats = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await api.get("/api/chat", config);
      setChats(data);
    } catch (error) {
      toast({ title: "Error Occurred!", description: "Failed to load the chats", status: "error", duration: 5000, isClosable: true, position: "bottom-left" });
    }
  };

  useEffect(() => {
    setLoggedUser(JSON.parse(localStorage.getItem("userInfo")));
    fetchChats();
    // eslint-disable-next-line
  }, [fetchAgain]);

  const confirmDelete = (e, chat) => {
    e.stopPropagation();
    setChatToDelete(chat);
    onOpen();
  };

  const deleteChat = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await api.delete(`/api/chat/${chatToDelete._id}`, config);
      setChats(chats.filter((c) => c._id !== chatToDelete._id));
      if (selectedChat && selectedChat._id === chatToDelete._id) setSelectedChat(null);
      toast({ title: "Chat deleted", status: "success", duration: 3000, isClosable: true });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete chat", status: "error", duration: 3000, isClosable: true });
    }
    onClose();
    setChatToDelete(null);
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return "now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return date.toLocaleDateString([], { day: "2-digit", month: "short" });
  };

  return (
    <Box
      display={{ base: selectedChat ? "none" : "flex", md: "flex" }}
      flexDir="column"
      alignItems="center"
      p={0}
      bg={colors.bg}
      w={{ base: "100%", md: "31%" }}
      h="100%"
      borderRadius="lg"
      borderWidth="1px"
      borderColor={colors.border}
      transition="all 0.3s"
      overflow="hidden"
    >
      {/* Header */}
      <Box
        pb={3}
        px={3}
        pt={3}
        fontSize={{ base: "20px", md: "22px" }}
        fontFamily="Work sans"
        fontWeight="bold"
        display="flex"
        w="100%"
        justifyContent="space-between"
        alignItems="center"
        bg={colors.header}
        borderBottomWidth="1px"
        borderColor={colors.border}
      >
        <Text color={colors.text}>My Chats</Text>
        <GroupChatModal>
          <Button
            display="flex"
            fontSize={{ base: "14px", md: "12px", lg: "14px" }}
            rightIcon={<AddIcon />}
            size="sm"
            colorScheme="teal"
            variant="outline"
          >
            New Group
          </Button>
        </GroupChatModal>
      </Box>

      {/* Status Bar */}
      <StatusBar />

      {/* Chat List */}
      <Box
        display="flex"
        flexDir="column"
        w="100%"
        h="100%"
        overflowY="hidden"
        bg={colors.sidebar}
      >
        {chats ? (
          <Stack overflowY="scroll" spacing={0}>
            {chats.map((chat) => {
              const isSelected = selectedChat && selectedChat._id === chat._id;
              const senderFull = !chat.isGroupChat && loggedUser
                ? getSenderFull(loggedUser, chat.users)
                : null;
              const displayName = !chat.isGroupChat
                ? getSender(loggedUser, chat.users)
                : chat.chatName;

              return (
                <Box
                  key={chat._id}
                  onClick={() => setSelectedChat(chat)}
                  cursor="pointer"
                  bg={isSelected ? colors.chatItemSelected : colors.sidebar}
                  borderBottomWidth="1px"
                  borderColor={isCyberpunk ? (isSelected ? "#b84bff55" : "#b84bff22") : colors.border}
                  px={3}
                  py={3}
                  transition="all 0.2s"
                  _hover={{ bg: isSelected ? colors.chatItemSelected : colors.chatItem }}
                  position="relative"
                  role="group"
                  className={isCyberpunk ? "cyber-chat-item" : ""}
                  boxShadow={isCyberpunk && isSelected ? "inset 3px 0 0 #b84bff, 0 0 12px #b84bff22" : undefined}
                >
                  <HStack spacing={3} align="flex-start">
                    {/* Avatar */}
                    <Avatar
                      size="md"
                      name={displayName}
                      src={senderFull ? senderFull.pic : undefined}
                      flexShrink={0}
                    />

                    {/* Name + Last message */}
                    <VStack align="flex-start" spacing={0} flex={1} minW={0}>
                      <HStack w="100%" justify="space-between">
                        <Text
                          fontWeight="semibold"
                          fontSize="sm"
                          color={isSelected ? "white" : colors.text}
                          isTruncated
                          maxW="65%"
                        >
                          {displayName}
                        </Text>
                        <Text
                          fontSize="xs"
                          color={isSelected ? "whiteAlpha.800" : colors.subText}
                          flexShrink={0}
                        >
                          {chat.latestMessage
                            ? formatTime(chat.latestMessage.createdAt)
                            : formatTime(chat.updatedAt)}
                        </Text>
                      </HStack>

                      {chat.latestMessage ? (
                        <Text
                          fontSize="xs"
                          color={isSelected ? "whiteAlpha.800" : colors.subText}
                          isTruncated
                          maxW="90%"
                        >
                          {chat.latestMessage.content
                            ? (chat.isGroupChat
                                ? `${chat.latestMessage.sender.name}: `
                                : "") +
                              (chat.latestMessage.content.length > 40
                                ? chat.latestMessage.content.substring(0, 40) + "..."
                                : chat.latestMessage.content)
                            : chat.latestMessage.fileUrl
                            ? "📎 File"
                            : ""}
                        </Text>
                      ) : (
                        <Text fontSize="xs" color={isSelected ? "whiteAlpha.600" : colors.subText} fontStyle="italic">
                          No messages yet
                        </Text>
                      )}
                    </VStack>
                  </HStack>

                  {/* Delete Button */}
                  <IconButton
                    icon={<DeleteIcon />}
                    size="xs"
                    colorScheme="red"
                    variant="ghost"
                    position="absolute"
                    bottom="8px"
                    right="8px"
                    opacity={0}
                    _groupHover={{ opacity: 1 }}
                    onClick={(e) => confirmDelete(e, chat)}
                    aria-label="Delete chat"
                  />
                </Box>
              );
            })}
          </Stack>
        ) : (
          <ChatLoading />
        )}
      </Box>

      {/* Delete Confirmation Dialog */}
      <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent bg={colors.modalBg}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold" color={colors.text}>
              Delete Chat
            </AlertDialogHeader>
            <AlertDialogBody color={colors.text}>
              Kya aap sure hain? Yeh chat permanently delete ho jayegi.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>Cancel</Button>
              <Button colorScheme="red" onClick={deleteChat} ml={3}>Delete</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default MyChats;
