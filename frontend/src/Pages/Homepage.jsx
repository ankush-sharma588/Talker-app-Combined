import {
  Box, Container, Tab, TabList, TabPanel, TabPanels, Tabs, Text,
} from "@chakra-ui/react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Login from "../components/Authentication/Login";
import Signup from "../components/Authentication/Signup";
import { useTheme } from "../Context/ThemeContext";
import ThemePicker from "../components/miscellaneous/ThemePicker";
import { useViewportHeight } from "../hooks/useViewportHeight";

export default function Homepage() {
  const navigate = useNavigate();
  const { colors, isCyberpunk } = useTheme();
  const viewportHeight = useViewportHeight();

  useEffect(() => {
    if (JSON.parse(localStorage.getItem("userInfo"))) navigate("/chats");
  }, [navigate]);

  return (
    <Box
      minH={`${viewportHeight}px`}
      bg={colors.bg}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={4}
      position="relative"
      transition="background 0.3s"
      overflowY="auto"
    >
      {/* Cyberpunk background glow orbs */}
      {isCyberpunk && (
        <>
          <Box
            position="absolute"
            top="-20%"
            left="-10%"
            w="500px"
            h="500px"
            borderRadius="full"
            bg="radial-gradient(circle, rgba(184,75,255,0.12) 0%, transparent 70%)"
            pointerEvents="none"
            style={{ animation: "neon-pulse 4s ease-in-out infinite" }}
          />
          <Box
            position="absolute"
            bottom="-20%"
            right="-10%"
            w="500px"
            h="500px"
            borderRadius="full"
            bg="radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)"
            pointerEvents="none"
            style={{ animation: "neon-pulse 4s ease-in-out infinite", animationDelay: "2s" }}
          />
          {/* Grid overlay */}
          <Box
            position="absolute"
            inset={0}
            pointerEvents="none"
            style={{
              backgroundImage: `
                linear-gradient(rgba(184,75,255,0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(59,130,246,0.05) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
            }}
          />
        </>
      )}

      {/* Theme picker in corner */}
      <Box position="absolute" top={4} right={4}>
        <ThemePicker>
          <Box
            as="button"
            px={3}
            py={1.5}
            borderRadius="lg"
            bg={colors.chatItem}
            color={isCyberpunk ? "#b84bff" : colors.subText}
            border={isCyberpunk ? "1px solid #b84bff55" : `1px solid ${colors.border}`}
            boxShadow={isCyberpunk ? "0 0 10px #b84bff33" : undefined}
            fontFamily={isCyberpunk ? "'Orbitron', monospace" : undefined}
            letterSpacing={isCyberpunk ? "wider" : undefined}
            fontSize={isCyberpunk ? "xs" : "sm"}
            _hover={isCyberpunk
              ? { borderColor: "#b84bff", boxShadow: "0 0 16px #b84bff55", color: "#d084ff" }
              : { borderColor: colors.accent, color: colors.accent }
            }
            transition="all 0.2s"
          >
            {isCyberpunk ? "⚡ CONFIG" : "🎨 Theme"}
          </Box>
        </ThemePicker>
      </Box>

      <Container maxW="420px" w="100%" position="relative">
        <Box textAlign="center" mb={8}>
          <Text
            fontSize={isCyberpunk ? "4xl" : "3xl"}
            fontWeight="800"
            letterSpacing={isCyberpunk ? "wider" : "-0.5px"}
            color={colors.text}
            fontFamily={isCyberpunk ? "'Orbitron', monospace" : undefined}
            style={isCyberpunk ? {
              textShadow: "0 0 20px rgba(184,75,255,0.5), 0 0 40px rgba(184,75,255,0.2)",
              animation: "cyber-flicker 8s ease-in-out infinite",
            } : undefined}
          >
            ⚡{" "}
            <Box
              as="span"
              color={isCyberpunk ? "#b84bff" : colors.accent}
              style={isCyberpunk ? { textShadow: "0 0 24px #b84bff, 0 0 48px #b84bff55" } : undefined}
            >
              Talker
            </Box>
          </Text>
          <Text
            fontSize="sm"
            mt={1}
            color={isCyberpunk ? "#7857aa" : colors.subText}
            fontFamily={isCyberpunk ? "'Share Tech Mono', monospace" : undefined}
            style={isCyberpunk ? { letterSpacing: "2px" } : undefined}
          >
            {isCyberpunk ? "// Real-time chat, reimagined" : "Real-time chat, reimagined"}
          </Text>
        </Box>

        {/* Main card with cyberpunk animated border */}
        <Box position="relative">
          {isCyberpunk && (
            <Box
              position="absolute"
              inset="-2px"
              background="linear-gradient(90deg, #b84bff, #3b82f6, #06b6d4, #b84bff)"
              backgroundSize="300% 300%"
              style={{ animation: "cyber-border-spin 4s linear infinite", zIndex: 0 }}
              borderRadius="24px"
            />
          )}
          <Box
            bg={colors.sidebar}
            borderRadius="2xl"
            overflow="hidden"
            border={isCyberpunk ? "none" : `1px solid ${colors.border}`}
            boxShadow={isCyberpunk ? "0 0 40px #b84bff22, 0 0 80px #3b82f611" : colors.shadow}
            transition="background 0.3s"
            position="relative"
            zIndex={1}
          >
            <Tabs isFitted variant="unstyled">
              <TabList borderBottom={isCyberpunk ? "1px solid #b84bff33" : `1px solid ${colors.border}`}>
                {["Login", "Sign Up"].map((t) => (
                  <Tab
                    key={t}
                    py={4}
                    fontWeight="600"
                    fontSize="sm"
                    color={isCyberpunk ? "#7857aa" : colors.subText}
                    fontFamily={isCyberpunk ? "'Orbitron', monospace" : undefined}
                    letterSpacing={isCyberpunk ? "wider" : undefined}
                    _selected={{
                      color: isCyberpunk ? "#b84bff" : colors.accent,
                      borderBottom: isCyberpunk ? "2px solid #b84bff" : `2px solid ${colors.accent}`,
                      textShadow: isCyberpunk ? "0 0 8px #b84bff" : undefined,
                      boxShadow: isCyberpunk ? "0 2px 8px #b84bff44" : undefined,
                    }}
                    transition="all 0.2s"
                  >
                    {t}
                  </Tab>
                ))}
              </TabList>
              <TabPanels>
                <TabPanel p={6}><Login /></TabPanel>
                <TabPanel p={6}><Signup /></TabPanel>
              </TabPanels>
            </Tabs>
          </Box>
        </Box>

        <Text
          textAlign="center"
          mt={5}
          fontSize="xs"
          color={isCyberpunk ? "#4a3570" : colors.subText}
          fontFamily={isCyberpunk ? "'Share Tech Mono', monospace" : undefined}
        >
          {isCyberpunk ? "// © 2026 Talker — Built by Ankush" : "© 2026 Talker — Built by Ankush"}
        </Text>
      </Container>
    </Box>
  );
}
