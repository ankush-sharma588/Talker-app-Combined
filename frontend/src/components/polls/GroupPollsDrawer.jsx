import {
  Drawer, DrawerOverlay, DrawerContent, DrawerHeader, DrawerBody,
  DrawerCloseButton, VStack, Text, Spinner, Button, Box, HStack,
  useDisclosure,
} from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";
import { useEffect, useState, useCallback } from "react";
import api from "../../config/api";
import { ChatState } from "../../Context/ChatProvider";
import { useTheme } from "../../Context/ThemeContext";
import PollCard from "./PollCard";
import CreatePollModal from "./CreatePollModal";

const GroupPollsDrawer = ({ isOpen, onClose, socket }) => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { user, selectedChat } = ChatState();
  const { colors, isCyberpunk } = useTheme();

  const fetchPolls = useCallback(async () => {
    if (!selectedChat?._id) return;
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await api.get(`/api/poll/${selectedChat._id}`, config);
      setPolls(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [selectedChat?._id, user.token]);

  useEffect(() => {
    if (isOpen) fetchPolls();
  }, [isOpen, fetchPolls]);

  // Real-time socket listeners
  useEffect(() => {
    if (!socket) return;

    const handlePollCreated = (poll) => {
      setPolls((prev) => [poll, ...prev]);
    };
    const handlePollUpdated = (updatedPoll) => {
      setPolls((prev) => prev.map((p) => (p._id === updatedPoll._id ? updatedPoll : p)));
    };
    const handlePollDeleted = (pollId) => {
      setPolls((prev) => prev.filter((p) => p._id !== pollId));
    };

    socket.on("poll created", handlePollCreated);
    socket.on("poll updated", handlePollUpdated);
    socket.on("poll deleted", handlePollDeleted);

    return () => {
      socket.off("poll created", handlePollCreated);
      socket.off("poll updated", handlePollUpdated);
      socket.off("poll deleted", handlePollDeleted);
    };
  }, [socket]);

  const handlePollCreated = (poll) => {
    setPolls((prev) => [poll, ...prev]);
    if (socket) socket.emit("poll created", { chatId: selectedChat._id, poll });
  };

  const handlePollUpdated = (updatedPoll) => {
    setPolls((prev) => prev.map((p) => (p._id === updatedPoll._id ? updatedPoll : p)));
  };

  const handlePollDeleted = (pollId) => {
    setPolls((prev) => prev.filter((p) => p._id !== pollId));
  };

  return (
    <>
      <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="sm">
        <DrawerOverlay backdropFilter="blur(2px)" />
        <DrawerContent
          bg={colors.sidebarBg}
          color={colors.text}
          borderLeft={`1px solid ${colors.accent}44`}
          boxShadow={isCyberpunk ? `-4px 0 24px ${colors.accent}33` : "xl"}
        >
          <DrawerCloseButton color={colors.text} />
          <DrawerHeader borderBottomWidth="1px" borderColor={`${colors.accent}33`}>
            <HStack justify="space-between" pr={8}>
              <Text fontSize="lg" fontWeight="bold" color={colors.accent}>
                📊 Group Polls
              </Text>
              <Button
                leftIcon={<AddIcon />}
                size="sm"
                bg={colors.accent}
                color="white"
                _hover={{ bg: colors.accentHover }}
                onClick={onCreateOpen}
              >
                New Poll
              </Button>
            </HStack>
          </DrawerHeader>

          <DrawerBody pt={4}>
            {loading ? (
              <Box display="flex" justifyContent="center" pt={10}>
                <Spinner color={colors.accent} size="lg" />
              </Box>
            ) : polls.length === 0 ? (
              <VStack spacing={4} pt={12} opacity={0.6}>
                <Text fontSize="3xl">📊</Text>
                <Text color={colors.textMuted} textAlign="center">
                  No polls yet. Create one to get the group's opinion!
                </Text>
              </VStack>
            ) : (
              <VStack spacing={3} align="stretch">
                {polls.map((poll) => (
                  <PollCard
                    key={poll._id}
                    poll={poll}
                    onPollUpdated={handlePollUpdated}
                    onPollDeleted={handlePollDeleted}
                    socket={socket}
                    chatId={selectedChat?._id}
                  />
                ))}
              </VStack>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <CreatePollModal
        isOpen={isCreateOpen}
        onClose={onCreateClose}
        onPollCreated={handlePollCreated}
      />
    </>
  );
};

export default GroupPollsDrawer;
