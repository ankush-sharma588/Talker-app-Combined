import { Box, Avatar, Text } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { useTheme } from "../Context/ThemeContext";

// Keyframes
const rise = keyframes`
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30%            { transform: translateY(-7px); opacity: 1; }
`;
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const glow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 var(--accent-dim); }
  50%       { box-shadow: 0 0 8px 3px var(--accent-dim); }
`;

export default function TypingIndicator({ senderName, senderPic }) {
  const { colors } = useTheme();

  return (
    <Box
      display="flex"
      alignItems="flex-end"
      gap={2}
      mt={2}
      mb={1}
      animation={`${fadeIn} 0.25s ease`}
    >
      {/* Avatar */}
      {senderPic !== undefined && (
        <Avatar size="xs" name={senderName} src={senderPic} mb="2px" flexShrink={0} />
      )}

      <Box>
        {senderName && (
          <Text fontSize="10px" color={colors.subText} mb={1} ml={1} fontWeight="500">
            {senderName}
          </Text>
        )}

        {/* Bubble */}
        <Box
          display="inline-flex"
          alignItems="center"
          gap="5px"
          px={4}
          py={3}
          borderRadius="20px 20px 20px 4px"
          bg={colors.typingBg}
          border={`1px solid ${colors.border}`}
          animation={`${glow} 2s ease-in-out infinite`}
          boxShadow={colors.shadow}
          position="relative"
          _before={{
            content: '""',
            position: "absolute",
            bottom: "-1px",
            left: "-1px",
            w: "10px",
            h: "10px",
            bg: colors.typingBg,
            clipPath: "polygon(0 0, 100% 0, 0 100%)",
          }}
        >
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              as="span"
              w="7px"
              h="7px"
              borderRadius="full"
              bg={colors.accent}
              display="inline-block"
              animation={`${rise} 1.3s ease-in-out infinite`}
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
