import {
  Box, Text, VStack, HStack, Button, Progress, Badge, Tooltip,
  IconButton, Avatar, AvatarGroup, useToast,
} from "@chakra-ui/react";
import { CheckIcon, LockIcon, DeleteIcon } from "@chakra-ui/icons";
import { useState } from "react";
import api from "../../config/api";
import { ChatState } from "../../Context/ChatProvider";
import { useTheme } from "../../Context/ThemeContext";

const PollCard = ({ poll, onPollUpdated, onPollDeleted, socket, chatId }) => {
  const { user } = ChatState();
  const { colors, isCyberpunk } = useTheme();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.voters.length, 0);

  const userVotedIndexes = poll.options.reduce((acc, opt, idx) => {
    if (opt.voters.some((v) => (v._id || v) === user._id)) acc.push(idx);
    return acc;
  }, []);

  const hasVoted = userVotedIndexes.length > 0;
  const isCreator = (poll.createdBy?._id || poll.createdBy) === user._id;

  const handleVote = async (idx) => {
    if (poll.isClosed) return;
    try {
      setLoading(true);
      const config = { headers: { "Content-type": "application/json", Authorization: `Bearer ${user.token}` } };
      let newIndexes;
      if (poll.isMultipleChoice) {
        newIndexes = userVotedIndexes.includes(idx)
          ? userVotedIndexes.filter((i) => i !== idx)
          : [...userVotedIndexes, idx];
        if (newIndexes.length === 0) newIndexes = [idx]; // can't unvote all
      } else {
        newIndexes = [idx];
      }
      const { data } = await api.put(`/api/poll/${poll._id}/vote`, { optionIndexes: newIndexes }, config);
      onPollUpdated(data);
      if (socket) socket.emit("poll updated", { chatId, poll: data });
    } catch {
      toast({ title: "Failed to vote", status: "error", duration: 2000, position: "top" });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await api.put(`/api/poll/${poll._id}/close`, {}, config);
      onPollUpdated(data);
      if (socket) socket.emit("poll updated", { chatId, poll: data });
    } catch {
      toast({ title: "Failed to close poll", status: "error", duration: 2000, position: "top" });
    }
  };

  const handleDelete = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await api.delete(`/api/poll/${poll._id}`, config);
      onPollDeleted(poll._id);
      if (socket) socket.emit("poll deleted", { chatId, pollId: poll._id });
    } catch {
      toast({ title: "Failed to delete poll", status: "error", duration: 2000, position: "top" });
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const accentRgb = colors.accent;

  return (
    <Box
      bg={colors.sidebarBg}
      border={`1px solid ${colors.accent}44`}
      borderRadius="xl"
      p={4}
      my={2}
      maxW="360px"
      w="100%"
      boxShadow={isCyberpunk ? `0 0 12px ${colors.accent}33` : "md"}
      position="relative"
    >
      {/* Header */}
      <HStack justify="space-between" mb={3} align="flex-start">
        <VStack align="flex-start" spacing={0} flex={1}>
          <HStack spacing={1} mb={1} flexWrap="wrap">
            <Badge
              colorScheme={poll.isClosed ? "gray" : "purple"}
              variant="subtle"
              fontSize="10px"
            >
              {poll.isClosed ? "🔒 Closed" : "📊 Poll"}
            </Badge>
            {poll.isMultipleChoice && (
              <Badge colorScheme="blue" variant="subtle" fontSize="10px">Multi-choice</Badge>
            )}
          </HStack>
          <Text fontWeight="bold" color={colors.text} fontSize="sm" lineHeight="1.3">
            {poll.question}
          </Text>
        </VStack>
        {isCreator && (
          <HStack spacing={1}>
            {!poll.isClosed && (
              <Tooltip label="Close poll">
                <IconButton
                  icon={<LockIcon />}
                  size="xs"
                  variant="ghost"
                  color={colors.textMuted}
                  onClick={handleClose}
                  _hover={{ color: "orange.400" }}
                />
              </Tooltip>
            )}
            <Tooltip label="Delete poll">
              <IconButton
                icon={<DeleteIcon />}
                size="xs"
                variant="ghost"
                color={colors.textMuted}
                onClick={handleDelete}
                _hover={{ color: "red.400" }}
              />
            </Tooltip>
          </HStack>
        )}
      </HStack>

      {/* Options */}
      <VStack spacing={2} align="stretch">
        {poll.options.map((opt, idx) => {
          const pct = totalVotes > 0 ? Math.round((opt.voters.length / totalVotes) * 100) : 0;
          const voted = userVotedIndexes.includes(idx);
          const isWinner = !poll.isClosed
            ? false
            : opt.voters.length === Math.max(...poll.options.map((o) => o.voters.length)) && opt.voters.length > 0;

          return (
            <Box
              key={opt._id || idx}
              position="relative"
              borderRadius="lg"
              overflow="hidden"
              border={voted ? `1.5px solid ${accentRgb}` : `1px solid ${colors.accent}22`}
              cursor={poll.isClosed ? "default" : "pointer"}
              onClick={() => !poll.isClosed && !loading && handleVote(idx)}
              transition="all 0.15s"
              _hover={!poll.isClosed ? { borderColor: accentRgb, transform: "translateY(-1px)" } : {}}
            >
              {/* Progress bar background */}
              {(hasVoted || poll.isClosed) && (
                <Box
                  position="absolute"
                  left={0}
                  top={0}
                  bottom={0}
                  width={`${pct}%`}
                  bg={isWinner ? `${accentRgb}33` : `${accentRgb}18`}
                  transition="width 0.4s ease"
                  borderRadius="lg"
                />
              )}

              <HStack p={2} px={3} position="relative" justify="space-between">
                <HStack spacing={2} flex={1}>
                  {voted && (
                    <Box
                      w={4}
                      h={4}
                      borderRadius="full"
                      bg={colors.accent}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      flexShrink={0}
                    >
                      <CheckIcon color="white" boxSize={2} />
                    </Box>
                  )}
                  <Text
                    fontSize="sm"
                    color={voted ? colors.accent : colors.text}
                    fontWeight={isWinner ? "bold" : "normal"}
                    noOfLines={2}
                  >
                    {opt.text}
                    {isWinner && " 🏆"}
                  </Text>
                </HStack>

                {(hasVoted || poll.isClosed) && (
                  <HStack spacing={2} flexShrink={0}>
                    {opt.voters.length > 0 && (
                      <Tooltip
                        label={opt.voters.map((v) => v.name || v).join(", ")}
                        placement="top"
                      >
                        <AvatarGroup size="xs" max={3}>
                          {opt.voters.map((v, vi) => (
                            <Avatar key={vi} name={v.name} src={v.pic} size="xs" />
                          ))}
                        </AvatarGroup>
                      </Tooltip>
                    )}
                    <Text fontSize="xs" color={colors.textMuted} minW="36px" textAlign="right">
                      {pct}%
                    </Text>
                  </HStack>
                )}
              </HStack>
            </Box>
          );
        })}
      </VStack>

      {/* Footer */}
      <HStack justify="space-between" mt={3}>
        <Text fontSize="xs" color={colors.textMuted}>
          {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
        </Text>
        <Text fontSize="xs" color={colors.textMuted}>
          by {poll.createdBy?.name || "Unknown"} · {formatDate(poll.createdAt)}
        </Text>
      </HStack>

      {!hasVoted && !poll.isClosed && (
        <Text fontSize="10px" color={colors.textMuted} mt={1} textAlign="center">
          Tap an option to vote
        </Text>
      )}
    </Box>
  );
};

export default PollCard;
