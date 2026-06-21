import {
  Drawer, DrawerBody, DrawerHeader, DrawerOverlay, DrawerContent, DrawerCloseButton,
  Box, Text, SimpleGrid, Flex, Switch, Tooltip, useDisclosure, Spinner,
} from "@chakra-ui/react";
import { SunIcon, MoonIcon } from "@chakra-ui/icons";
import { useTheme } from "../../Context/ThemeContext";

export default function ThemePicker({ children }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isDarkMode, toggleTheme,
    accent, setAccent,
    background, setBackground,
    colors, ACCENT_COLORS, CHAT_BACKGROUNDS,
    isSaving,
    isCyberpunk, toggleCyberpunk,
  } = useTheme();

  const cyberpunkAccents = [
    { name: "Neon Purple", hex: "#b84bff" },
    { name: "Electric Blue", hex: "#3b82f6" },
    { name: "Cyber Cyan", hex: "#06b6d4" },
    { name: "Hot Pink", hex: "#ec4899" },
  ];

  return (
    <>
      <span onClick={onOpen}>{children}</span>

      <Drawer placement="right" onClose={onClose} isOpen={isOpen} size="xs">
        <DrawerOverlay backdropFilter="blur(4px)" />
        <DrawerContent
          bg={colors.modalBg}
          borderLeft={isCyberpunk ? "1px solid #b84bff66" : `1px solid ${colors.border}`}
          boxShadow={isCyberpunk ? "0 0 40px #b84bff33, -4px 0 32px #3b82f622" : undefined}
          className={isCyberpunk ? "cyber-fade-up" : ""}
        >
          <DrawerCloseButton color={colors.text} />
          <DrawerHeader
            borderBottomWidth="1px"
            borderColor={isCyberpunk ? "#b84bff44" : colors.border}
            color={colors.text}
            fontSize="md"
            fontWeight="700"
            fontFamily={isCyberpunk ? "'Orbitron', monospace" : undefined}
            letterSpacing={isCyberpunk ? "wider" : undefined}
          >
            {/* Cyberpunk animated border line */}
            {isCyberpunk && (
              <Box
                position="absolute"
                bottom="0" left="0" right="0"
                h="2px"
                className="cyber-header-line"
              />
            )}
            <Flex align="center" gap={2}>
              {isCyberpunk ? "⚡" : "🎨"} {isCyberpunk ? "SYSTEM CONFIG" : "Appearance"}
              {isSaving && <Spinner size="xs" color={colors.accent} />}
            </Flex>
          </DrawerHeader>

          <DrawerBody pt={5} overflowY="auto">

            {/* ── CYBERPUNK TOGGLE ── */}
            <Box
              mb={6} p={4} borderRadius="xl"
              border={isCyberpunk ? "1px solid #b84bff66" : `1px solid ${colors.border}`}
              bg={isCyberpunk ? "rgba(184,75,255,0.06)" : colors.chatItem}
              boxShadow={isCyberpunk ? "0 0 16px #b84bff22, inset 0 0 16px #b84bff0a" : undefined}
              position="relative"
              overflow="hidden"
            >
              {isCyberpunk && (
                <>
                  <Box
                    position="absolute" top={0} left={0} right={0} h="2px"
                    className="cyber-header-line"
                  />
                  <Box
                    position="absolute" bottom={0} left={0} right={0} h="2px"
                    className="cyber-header-line"
                    style={{ animationDelay: "1.5s" }}
                  />
                </>
              )}
              <Text
                fontSize="xs" fontWeight="600" color={colors.subText}
                textTransform="uppercase" letterSpacing="wider" mb={3}
                fontFamily={isCyberpunk ? "'Orbitron', monospace" : undefined}
              >
                {isCyberpunk ? "🌐 Cyberpunk Mode" : "✦ Cyberpunk Mode"}
              </Text>
              <Flex align="center" justify="space-between">
                <Flex align="center" gap={2}>
                  <Text fontSize="lg">⚡</Text>
                  <Box>
                    <Text
                      fontSize="sm" fontWeight="700"
                      color={isCyberpunk ? "#b84bff" : colors.text}
                      fontFamily={isCyberpunk ? "'Orbitron', monospace" : undefined}
                      style={isCyberpunk ? { textShadow: "0 0 8px #b84bff" } : undefined}
                    >
                      {isCyberpunk ? "ACTIVE" : "Cyberpunk"}
                    </Text>
                    <Text fontSize="xs" color={colors.subText}>
                      Neon glows · Animated borders
                    </Text>
                  </Box>
                </Flex>
                <Switch
                  isChecked={isCyberpunk}
                  onChange={toggleCyberpunk}
                  sx={{
                    "span.chakra-switch__track": {
                      bg: isCyberpunk ? "#b84bff" : colors.border,
                      boxShadow: isCyberpunk ? "0 0 8px #b84bff" : "none",
                    },
                    "span.chakra-switch__track[data-checked]": { bg: "#b84bff" },
                  }}
                />
              </Flex>
            </Box>

            {/* ── CYBERPUNK ACCENT COLORS (shown when cyberpunk is on) ── */}
            {isCyberpunk && (
              <Box mb={6}>
                <Text
                  fontSize="xs" fontWeight="600" color={colors.subText}
                  textTransform="uppercase" letterSpacing="wider" mb={3}
                  fontFamily="'Orbitron', monospace"
                >
                  Neon Palette
                </Text>
                <SimpleGrid columns={4} spacing={3} mb={3}>
                  {cyberpunkAccents.map((c) => (
                    <Tooltip key={c.hex} label={c.name} placement="top" hasArrow>
                      <Box
                        as="button"
                        w="100%" h="40px"
                        borderRadius="xl"
                        bg={c.hex}
                        border={accent === c.hex ? `2px solid white` : "2px solid transparent"}
                        onClick={() => setAccent(c.hex)}
                        transition="all 0.2s"
                        _hover={{
                          transform: "scale(1.08)",
                          boxShadow: `0 0 16px ${c.hex}, 0 0 32px ${c.hex}55`,
                        }}
                        boxShadow={accent === c.hex ? `0 0 12px ${c.hex}, 0 0 24px ${c.hex}88` : `0 0 6px ${c.hex}55`}
                      />
                    </Tooltip>
                  ))}
                </SimpleGrid>
              </Box>
            )}

            {/* ── DARK / LIGHT TOGGLE (hidden in cyberpunk) ── */}
            {!isCyberpunk && (
              <>
                <Text fontSize="xs" fontWeight="600" color={colors.subText} textTransform="uppercase" letterSpacing="wider" mb={3}>
                  Mode
                </Text>
                <Flex
                  align="center" justify="space-between" px={4} py={3} borderRadius="xl"
                  bg={colors.chatItem} border={`1px solid ${colors.border}`} mb={6}
                >
                  <Flex align="center" gap={2}>
                    {isDarkMode
                      ? <MoonIcon color={colors.accent} />
                      : <SunIcon color={colors.accent} />}
                    <Text fontSize="sm" fontWeight="500" color={colors.text}>
                      {isDarkMode ? "Dark Mode" : "Light Mode"}
                    </Text>
                  </Flex>
                  <Switch
                    isChecked={isDarkMode}
                    onChange={toggleTheme}
                    sx={{
                      "span.chakra-switch__track": { bg: isDarkMode ? colors.accent : colors.border },
                      "span.chakra-switch__track[data-checked]": { bg: colors.accent },
                    }}
                  />
                </Flex>
              </>
            )}

            {/* ── ACCENT COLOURS ── */}
            {!isCyberpunk && (
              <>
                <Text fontSize="xs" fontWeight="600" color={colors.subText} textTransform="uppercase" letterSpacing="wider" mb={3}>
                  Accent Color
                </Text>
                <SimpleGrid columns={4} spacing={3} mb={4}>
                  {ACCENT_COLORS.map((c) => (
                    <Tooltip key={c.hex} label={c.name} placement="top" hasArrow>
                      <Box
                        as="button"
                        w="100%" h="40px"
                        borderRadius="xl"
                        bg={c.hex}
                        border={accent === c.hex ? `3px solid ${colors.text}` : "3px solid transparent"}
                        onClick={() => setAccent(c.hex)}
                        transition="transform 0.15s, box-shadow 0.15s"
                        _hover={{ transform: "scale(1.08)", boxShadow: `0 0 12px ${c.hex}88` }}
                        boxShadow={accent === c.hex ? `0 0 0 2px ${colors.bg}, 0 0 0 4px ${c.hex}` : "none"}
                      />
                    </Tooltip>
                  ))}
                </SimpleGrid>

                {/* Custom hex input */}
                <Text fontSize="xs" fontWeight="600" color={colors.subText} textTransform="uppercase" letterSpacing="wider" mb={2}>
                  Custom Color
                </Text>
                <Flex gap={2} align="center" mb={6}>
                  <Box
                    as="input"
                    type="color"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    w="48px" h="40px"
                    borderRadius="lg"
                    border={`1px solid ${colors.border}`}
                    bg={colors.inputBg}
                    cursor="pointer"
                    style={{ padding: "2px" }}
                  />
                  <Box
                    as="input"
                    type="text"
                    value={accent}
                    onChange={(e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && setAccent(e.target.value)}
                    placeholder="#7c3aed"
                    style={{
                      flex: 1, padding: "8px 12px", borderRadius: "10px", fontSize: "13px",
                      background: colors.inputBg, color: colors.text,
                      border: `1px solid ${colors.border}`, outline: "none",
                      fontFamily: "monospace",
                    }}
                  />
                </Flex>
              </>
            )}

            {/* ── CHAT BACKGROUND ── */}
            <Text
              fontSize="xs" fontWeight="600" color={colors.subText}
              textTransform="uppercase" letterSpacing="wider" mb={3}
              fontFamily={isCyberpunk ? "'Orbitron', monospace" : undefined}
            >
              {isCyberpunk ? "Environment" : "Chat Background"}
            </Text>
            <SimpleGrid columns={3} spacing={2} mb={6}>
              {CHAT_BACKGROUNDS.map((bg) => {
                const bgStyle = bg.style(colors);
                const isSelected = background === bg.id;
                return (
                  <Tooltip key={bg.id} label={bg.name} placement="top" hasArrow>
                    <Box
                      as="button"
                      w="100%"
                      h="52px"
                      borderRadius="xl"
                      border={isSelected
                        ? `3px solid ${isCyberpunk ? "#b84bff" : colors.accent}`
                        : `2px solid ${isCyberpunk ? "#b84bff33" : colors.border}`}
                      onClick={() => setBackground(bg.id)}
                      overflow="hidden"
                      position="relative"
                      transition="transform 0.15s, box-shadow 0.15s"
                      _hover={{
                        transform: "scale(1.05)",
                        boxShadow: `0 0 10px ${isCyberpunk ? "#b84bff" : colors.accent}55`,
                      }}
                      boxShadow={isSelected
                        ? `0 0 0 1px ${colors.bg}, 0 0 12px ${isCyberpunk ? "#b84bff" : colors.accent}88`
                        : "none"}
                      style={bgStyle}
                    >
                      {isSelected && (
                        <Box
                          position="absolute" top="50%" left="50%"
                          transform="translate(-50%, -50%)"
                          w="18px" h="18px" borderRadius="full"
                          bg={isCyberpunk ? "#b84bff" : colors.accent}
                          display="flex" alignItems="center" justifyContent="center"
                          boxShadow={isCyberpunk ? "0 0 8px #b84bff" : undefined}
                        >
                          <Text fontSize="9px" color="white" fontWeight="bold">✓</Text>
                        </Box>
                      )}
                    </Box>
                  </Tooltip>
                );
              })}
            </SimpleGrid>

            {/* ── PREVIEW ── */}
            <Text
              fontSize="xs" fontWeight="600" color={colors.subText}
              textTransform="uppercase" letterSpacing="wider" mb={3}
              fontFamily={isCyberpunk ? "'Orbitron', monospace" : undefined}
            >
              {isCyberpunk ? "Preview // Live" : "Preview"}
            </Text>
            <Box
              borderRadius="xl"
              overflow="hidden"
              border={isCyberpunk ? "1px solid #b84bff55" : `1px solid ${colors.border}`}
              boxShadow={isCyberpunk ? "0 0 20px #b84bff22" : undefined}
            >
              {isCyberpunk && (
                <Box h="2px" className="cyber-header-line" />
              )}
              <Box
                bg={colors.header} px={3} py={2}
                borderBottom={isCyberpunk ? "1px solid #b84bff33" : `1px solid ${colors.border}`}
              >
                <Text
                  fontSize="xs" fontWeight="700" color={isCyberpunk ? "#b84bff" : colors.text}
                  fontFamily={isCyberpunk ? "'Orbitron', monospace" : undefined}
                  style={isCyberpunk ? { textShadow: "0 0 8px #b84bff" } : undefined}
                >
                  ⚡ Talker
                </Text>
              </Box>
              <Box
                px={3} py={3}
                display="flex" flexDir="column" gap={2}
                style={CHAT_BACKGROUNDS.find((b) => b.id === background)?.style(colors) || {}}
              >
                <Flex justify="flex-end">
                  <Box
                    px={3} py={1.5}
                    borderRadius="14px 14px 2px 14px"
                    maxW="75%"
                    background={isCyberpunk ? "linear-gradient(135deg, #7c3aed, #3b82f6)" : colors.myMessage}
                    boxShadow={isCyberpunk ? "0 0 10px #7c3aed55" : undefined}
                  >
                    <Text fontSize="xs" color="white">Hey! How are you? 👋</Text>
                  </Box>
                </Flex>
                <Flex>
                  <Box
                    px={3} py={1.5}
                    borderRadius="14px 14px 14px 2px"
                    maxW="75%"
                    bg={colors.otherMessage}
                    border={isCyberpunk ? "1px solid #b84bff33" : `1px solid ${colors.border}`}
                    boxShadow={isCyberpunk ? "0 0 6px #3b82f622" : undefined}
                  >
                    <Text fontSize="xs" color={colors.text}>I'm great, thanks! 😊</Text>
                  </Box>
                </Flex>
              </Box>
            </Box>

            {/* Save status */}
            <Flex align="center" justify="center" mt={4} gap={2}>
              {isSaving ? (
                <>
                  <Spinner size="xs" color={colors.accent} />
                  <Text fontSize="xs" color={colors.subText}>Saving to account…</Text>
                </>
              ) : (
                <Text fontSize="xs" color={colors.subText}>
                  {isCyberpunk ? "// Preferences synced" : "✓ Preferences saved to your account"}
                </Text>
              )}
            </Flex>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
