import {
  Box, HStack, Avatar, Text, VStack, Spinner, useDisclosure,
} from "@chakra-ui/react";
import { useState, useEffect, useCallback } from "react";
import api from "../../config/api";
import { ChatState } from "../../Context/ChatProvider";
import { useTheme } from "../../Context/ThemeContext";
import StatusUploadModal from "./StatusUploadModal";
import StatusViewer from "./StatusViewer";

function StatusBar() {
  const { user } = ChatState();
  const { colors } = useTheme();
  const [grouped, setGrouped] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const { isOpen: isUploadOpen, onOpen: onUploadOpen, onClose: onUploadClose } = useDisclosure();
  const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();

  const fetchStatuses = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data } = await api.get("/api/status", {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setGrouped(data);
    } catch (_) {}
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchStatuses(); }, [fetchStatuses]);

  const openStatus = (group) => {
    setSelected(group);
    onViewOpen();
  };

  const myGroup = grouped.find((g) => g.user._id === user?._id);
  const others = grouped.filter((g) => g.user._id !== user?._id);

  const hasViewed = (group) => {
    if (!group || !group.statuses) return false;
    return group.statuses.every((s) =>
      s.viewers?.some((v) => (v.user?._id || v.user) === user?._id)
    );
  };

  const ringColor = (group) => {
    if (!group) return colors.border;
    return hasViewed(group) ? colors.border : colors.accent;
  };

  return (
    <>
      <Box
        w="100%" py={2} px={2} borderBottom={`1px solid ${colors.border}`}
        bg={colors.header} overflowX="auto"
        css={{ "&::-webkit-scrollbar": { height: "3px" }, "&::-webkit-scrollbar-thumb": { background: colors.border } }}
      >
        <HStack spacing={3} minW="max-content">
          {/* Add My Status */}
          <VStack spacing={1} align="center" cursor="pointer" onClick={onUploadOpen} flexShrink={0}>
            <Box position="relative">
              <Avatar
                size="md" name={user?.name} src={user?.pic}
                border={`2px dashed ${colors.accent}`}
                opacity={0.9} _hover={{ opacity: 1 }}
                transition="opacity 0.2s"
              />
              <Box
                position="absolute" bottom={0} right={0}
                bg={colors.accent} color="white" borderRadius="full"
                w="18px" h="18px" display="flex" alignItems="center" justifyContent="center"
                fontSize="12px" fontWeight="bold" border={`2px solid ${colors.bg}`}
              >+</Box>
            </Box>
            <Text fontSize="10px" color={colors.subText} fontWeight="600" noOfLines={1} maxW="52px" textAlign="center">
              {myGroup ? "My Status" : "Add Status"}
            </Text>
          </VStack>

          {/* My status ring if exists */}
          {myGroup && (
            <VStack spacing={1} align="center" cursor="pointer" onClick={() => openStatus(myGroup)} flexShrink={0}>
              <Box
                borderRadius="full" p="2px"
                bg={`conic-gradient(${ringColor(myGroup)} 0deg, ${ringColor(myGroup)} 360deg)`}
              >
                <Avatar size="md" name={myGroup.user.name} src={myGroup.user.pic} border={`2px solid ${colors.bg}`} />
              </Box>
              <Text fontSize="10px" color={colors.subText} noOfLines={1} maxW="52px" textAlign="center">You</Text>
            </VStack>
          )}

          {loading && <Spinner size="sm" color={colors.accent} />}

          {/* Others */}
          {others.map((group) => (
            <VStack key={group.user._id} spacing={1} align="center" cursor="pointer"
              onClick={() => openStatus(group)} flexShrink={0}>
              <Box
                borderRadius="full" p="2px"
                background={
                  hasViewed(group)
                    ? `${colors.border}`
                    : `conic-gradient(${colors.accent} 0deg, ${colors.accent} 360deg)`
                }
              >
                <Avatar size="md" name={group.user.name} src={group.user.pic} border={`2px solid ${colors.bg}`} />
              </Box>
              <Text fontSize="10px" color={colors.subText} noOfLines={1} maxW="52px" textAlign="center">
                {group.user.name.split(" ")[0]}
              </Text>
            </VStack>
          ))}

          {!loading && grouped.length === 0 && (
            <Text fontSize="xs" color={colors.subText} px={2}>No statuses yet. Be the first!</Text>
          )}
        </HStack>
      </Box>

      <StatusUploadModal isOpen={isUploadOpen} onClose={onUploadClose} onSuccess={fetchStatuses} />

      {selected && (
        <StatusViewer
          isOpen={isViewOpen}
          onClose={() => { onViewClose(); setSelected(null); }}
          userStatuses={selected}
          onDelete={fetchStatuses}
        />
      )}
    </>
  );
}

export default StatusBar;
