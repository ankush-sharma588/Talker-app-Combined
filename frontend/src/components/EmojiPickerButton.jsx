import { useRef, useState, useEffect } from "react";
import { Box, IconButton, Tooltip } from "@chakra-ui/react";
import EmojiPicker from "emoji-picker-react";
import { useTheme } from "../Context/ThemeContext";

/**
 * EmojiPickerButton
 * Props:
 *   onEmojiSelect(emoji: string) – called with the emoji character
 *   inputRef               – ref to the <input> so we can restore cursor position
 */
const EmojiPickerButton = ({ onEmojiSelect, inputRef }) => {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);
  const btnRef = useRef(null);
  const { colors } = useTheme();

  // Detect colour scheme for the picker
  const isDark = colors.chatBg === "#0f0f0f" ||
    (colors.chatBg && colors.chatBg.startsWith("#0")) ||
    colors.text === "#ffffff" || colors.text === "#f0f0f0";

  // Close picker when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (
        pickerRef.current && !pickerRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") setOpen(false); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleEmojiClick = (emojiData) => {
    const emoji = emojiData.emoji;

    if (inputRef?.current) {
      const input = inputRef.current;
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      const before = input.value.slice(0, start);
      const after = input.value.slice(end);
      const newValue = before + emoji + after;
      const newCursor = start + emoji.length;

      // Fire onEmojiSelect with the full new value and cursor info
      onEmojiSelect(newValue, newCursor);

      // Restore focus + cursor after state update
      requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(newCursor, newCursor);
      });
    } else {
      onEmojiSelect(emoji, null);
    }
    // keep picker open so user can pick multiple emojis
  };

  return (
    <Box position="relative" display="inline-flex" alignItems="center">
      <Tooltip label="Emoji" hasArrow>
        <IconButton
          ref={btnRef}
          aria-label="Open emoji picker"
          icon={<span style={{ fontSize: "18px", lineHeight: 1 }}>😊</span>}
          size="sm"
          variant="ghost"
          color={open ? colors.accent : colors.subText}
          bg={open ? colors.accentDim : undefined}
          _hover={{ color: colors.accent, bg: colors.accentDim }}
          onClick={() => setOpen((v) => !v)}
        />
      </Tooltip>

      {open && (
        <Box
          ref={pickerRef}
          position="absolute"
          bottom="44px"
          left={{ base: "-120px", md: "0px" }}
          zIndex={1500}
          boxShadow="xl"
          borderRadius="xl"
          overflow="hidden"
          /* Mobile: constrain width to viewport */
          maxW={{ base: "calc(100vw - 24px)", md: "352px" }}
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={isDark ? "dark" : "light"}
            skinTonesDisabled
            searchPlaceHolder="Search emoji…"
            width="100%"
            height={380}
            previewConfig={{ showPreview: false }}
            lazyLoadEmojis
          />
        </Box>
      )}
    </Box>
  );
};

export default EmojiPickerButton;
