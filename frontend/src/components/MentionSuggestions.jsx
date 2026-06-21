import { Box, Avatar, Text } from "@chakra-ui/react";
import { useTheme } from "../Context/ThemeContext";
import { toMentionHandle } from "../config/ChatLogics";

/**
 * Floating "@mention" suggestion dropdown.
 * Renders directly above the message input and lets the user pick
 * a chat member to mention via mouse or keyboard (↑ ↓ Enter/Tab, Esc).
 */
const MentionSuggestions = ({ users, activeIndex, onSelect, isCyberpunk }) => {
  const { colors } = useTheme();

  if (!users || users.length === 0) return null;

  return (
    <Box
      position="absolute"
      bottom="calc(100% + 6px)"
      left={0}
      w={{ base: "100%", sm: "280px" }}
      maxH="220px"
      overflowY="auto"
      bg={colors.modalBg}
      border={`1px solid ${colors.border}`}
      borderRadius="lg"
      boxShadow={isCyberpunk ? "0 0 16px #b84bff44, 0 4px 24px rgba(0,0,0,0.5)" : colors.shadow}
      zIndex={20}
      py={1}
    >
      {users.map((u, i) => (
        <Box
          key={u._id}
          display="flex"
          alignItems="center"
          gap={2}
          px={3}
          py={1.5}
          cursor="pointer"
          bg={i === activeIndex ? colors.accentDim : "transparent"}
          _hover={{ bg: colors.accentDim }}
          transition="background 0.1s"
          // onMouseDown (not onClick) so the input doesn't lose focus first
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(u);
          }}
        >
          <Avatar size="xs" name={u.name} src={u.pic} />
          <Box overflow="hidden">
            <Text fontSize="sm" fontWeight="600" color={colors.text} noOfLines={1}>
              {u.name}
            </Text>
            <Text fontSize="10px" color={colors.accent} noOfLines={1}>
              @{toMentionHandle(u.name)}
            </Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default MentionSuggestions;
