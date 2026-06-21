import { useEffect, useRef, useCallback } from "react";
import { Box, Input, IconButton, Text, HStack, Kbd } from "@chakra-ui/react";
import { CloseIcon, ChevronUpIcon, ChevronDownIcon } from "@chakra-ui/icons";
import { useTheme } from "../Context/ThemeContext";

const ChatSearchBar = ({
  query,
  setQuery,
  matchCount,
  currentMatch,
  onNext,
  onPrev,
  onClose,
}) => {
  const { colors } = useTheme();
  const inputRef = useRef(null);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keyboard shortcuts inside the bar
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.shiftKey ? onPrev() : onNext();
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [onNext, onPrev, onClose]
  );

  return (
    <Box
      px={3}
      py={2}
      bg={colors.header}
      borderBottom={`1px solid ${colors.border}`}
      display="flex"
      alignItems="center"
      gap={2}
      boxShadow={`0 2px 8px rgba(0,0,0,0.12)`}
      transition="background 0.3s"
    >
      {/* Search icon */}
      <Text fontSize="sm" color={colors.subText} flexShrink={0}>
        🔍
      </Text>

      {/* Input */}
      <Input
        ref={inputRef}
        size="sm"
        placeholder="Search in this chat…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        variant="filled"
        bg={colors.inputBg}
        color={colors.text}
        _placeholder={{ color: colors.subText }}
        _focus={{
          bg: colors.inputBg,
          borderColor: colors.accent,
          boxShadow: `0 0 0 1px ${colors.accent}`,
        }}
        _hover={{ bg: colors.inputBg }}
        borderRadius="lg"
        flex={1}
      />

      {/* Match counter */}
      {query.trim() && (
        <Text
          fontSize="xs"
          color={matchCount > 0 ? colors.accent : colors.subText}
          whiteSpace="nowrap"
          fontWeight="600"
          minW="56px"
          textAlign="center"
          flexShrink={0}
        >
          {matchCount === 0 ? "No results" : `${currentMatch + 1} / ${matchCount}`}
        </Text>
      )}

      {/* Prev / Next */}
      <HStack spacing={0} flexShrink={0}>
        <IconButton
          icon={<ChevronUpIcon />}
          size="xs"
          variant="ghost"
          color={colors.subText}
          _hover={{ color: colors.accent, bg: colors.accentDim }}
          onClick={onPrev}
          isDisabled={matchCount === 0}
          aria-label="Previous match"
          title="Previous match (Shift+Enter)"
        />
        <IconButton
          icon={<ChevronDownIcon />}
          size="xs"
          variant="ghost"
          color={colors.subText}
          _hover={{ color: colors.accent, bg: colors.accentDim }}
          onClick={onNext}
          isDisabled={matchCount === 0}
          aria-label="Next match"
          title="Next match (Enter)"
        />
      </HStack>

      {/* Close */}
      <IconButton
        icon={<CloseIcon boxSize="9px" />}
        size="xs"
        variant="ghost"
        color={colors.subText}
        _hover={{ color: colors.text, bg: colors.accentDim }}
        onClick={onClose}
        aria-label="Close search"
        flexShrink={0}
      />
    </Box>
  );
};

export default ChatSearchBar;
