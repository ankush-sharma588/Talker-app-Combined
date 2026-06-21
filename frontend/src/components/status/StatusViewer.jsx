import {
  Modal, ModalOverlay, ModalContent, Box, Text, Avatar, HStack,
  IconButton, Flex, Progress, VStack, useToast, Badge,
} from "@chakra-ui/react";
import { useState, useEffect, useRef, useCallback } from "react";
import api from "../../config/api";
import { ChatState } from "../../Context/ChatProvider";

function StatusViewer({ isOpen, onClose, userStatuses, onDelete }) {
  const { user } = ChatState();
  const toast = useToast();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef(null);
  const DURATION = 5000; // 5s per status

  const status = userStatuses?.statuses?.[currentIndex];
  const owner = userStatuses?.user;
  const isOwn = owner?._id === user?._id;

  const markViewed = useCallback(async (s) => {
    if (!s || isOwn) return;
    try {
      await api.put(`/api/status/${s._id}/view`, {}, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
    } catch (_) {}
  }, [user, isOwn]);

  const goNext = useCallback(() => {
    if (currentIndex < userStatuses.statuses.length - 1) {
      setCurrentIndex((i) => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, userStatuses, onClose]);

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setProgress(0);
    }
  };

  // Auto-advance timer
  useEffect(() => {
    if (!isOpen || paused || !status) return;
    markViewed(status);

    const step = 100 / (DURATION / 100);
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p + step >= 100) {
          clearInterval(intervalRef.current);
          setTimeout(goNext, 100);
          return 100;
        }
        return p + step;
      });
    }, 100);

    return () => clearInterval(intervalRef.current);
  }, [currentIndex, isOpen, paused, goNext, status, markViewed]);

  // Reset on open
  useEffect(() => {
    if (isOpen) { setCurrentIndex(0); setProgress(0); }
  }, [isOpen]);

  const handleDelete = async () => {
    try {
      await api.delete(`/api/status/${status._id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      toast({ title: "Status deleted", status: "success", duration: 2000, position: "top" });
      onDelete();
      onClose();
    } catch {
      toast({ title: "Failed to delete", status: "error", duration: 2000, position: "top" });
    }
  };

  if (!userStatuses || !status) return null;

  const timeAgo = (date) => {
    const diff = Math.floor((Date.now() - new Date(date)) / 60000);
    if (diff < 1) return "just now";
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  const timeLeft = (exp) => {
    const diff = Math.max(0, Math.floor((new Date(exp) - Date.now()) / 3600000));
    return `${diff}h left`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full" isCentered>
      <ModalOverlay bg="blackAlpha.950" />
      <ModalContent bg="black" borderRadius={0} h="100vh" m={0} overflow="hidden">
        <Box position="relative" w="100%" h="100%" display="flex" flexDir="column">

          {/* Progress bars */}
          <HStack spacing={1} px={3} pt={3} w="100%" zIndex={10} position="absolute" top={0}>
            {userStatuses.statuses.map((_, i) => (
              <Progress
                key={i} flex={1} size="xs" value={i < currentIndex ? 100 : i === currentIndex ? progress : 0}
                colorScheme="whiteAlpha" bg="whiteAlpha.300" borderRadius="full"
              />
            ))}
          </HStack>

          {/* Header */}
          <HStack px={3} pt={8} pb={2} zIndex={10} position="absolute" top={0} w="100%" justify="space-between">
            <HStack spacing={2}>
              <Avatar size="sm" name={owner?.name} src={owner?.pic} border="2px solid white" />
              <VStack spacing={0} align="start">
                <Text color="white" fontSize="sm" fontWeight="700">{owner?.name}</Text>
                <Text color="whiteAlpha.700" fontSize="xs">{timeAgo(status.createdAt)} · {timeLeft(status.expiresAt)}</Text>
              </VStack>
            </HStack>
            <HStack>
              {!isOwn && (
                <Badge colorScheme="whiteAlpha" bg="whiteAlpha.300" color="white" borderRadius="full" px={2} fontSize="xs">
                  👁 {status.viewers?.length || 0}
                </Badge>
              )}
              {isOwn && (
                <>
                  <Badge colorScheme="whiteAlpha" bg="whiteAlpha.300" color="white" borderRadius="full" px={2} fontSize="xs">
                    👁 {status.viewers?.length || 0} views
                  </Badge>
                  <IconButton
                    size="xs" variant="ghost" color="white" aria-label="delete"
                    icon={<Text>🗑</Text>} onClick={handleDelete}
                    _hover={{ bg: "whiteAlpha.200" }}
                  />
                </>
              )}
              <IconButton
                size="xs" variant="ghost" color="white" aria-label="close"
                icon={<Text fontSize="lg">✕</Text>} onClick={onClose}
                _hover={{ bg: "whiteAlpha.200" }}
              />
            </HStack>
          </HStack>

          {/* Media */}
          <Flex flex={1} align="center" justify="center" position="relative"
            onMouseDown={() => setPaused(true)} onMouseUp={() => setPaused(false)}
            onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)}
          >
            {status.mediaType === "image" ? (
              <img
                src={status.mediaUrl}
                alt="status"
                style={{ maxWidth: "100%", maxHeight: "100vh", objectFit: "contain", userSelect: "none" }}
              />
            ) : (
              <video
                src={status.mediaUrl}
                autoPlay
                muted={false}
                style={{ maxWidth: "100%", maxHeight: "100vh", objectFit: "contain" }}
              />
            )}

            {/* Left tap zone */}
            <Box position="absolute" left={0} top={0} w="35%" h="100%" cursor="pointer" onClick={goPrev} />
            {/* Right tap zone */}
            <Box position="absolute" right={0} top={0} w="35%" h="100%" cursor="pointer" onClick={goNext} />
          </Flex>

          {/* Caption */}
          {status.caption && (
            <Box
              position="absolute" bottom={0} w="100%" p={4}
              bgGradient="linear(to-t, blackAlpha.800, transparent)"
            >
              <Text color="white" fontSize="sm" textAlign="center">{status.caption}</Text>
            </Box>
          )}
        </Box>
      </ModalContent>
    </Modal>
  );
}

export default StatusViewer;
