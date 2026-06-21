import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  ModalFooter, Button, Box, Text, Avatar, Badge, Flex, Spinner, useToast,
  VStack, HStack, Divider, Input, IconButton, Tabs, TabList, Tab, TabPanels,
  TabPanel, Tooltip, useDisclosure,
} from "@chakra-ui/react";
import { useState } from "react";
import api from "../../config/api";
import { ChatState } from "../../Context/ChatProvider";
import { useTheme } from "../../Context/ThemeContext";

/* ─── SAMPLE / DEMO CONTACTS ──────────────────────────────────────────────── */
const DEMO_CONTACTS = [
  { name: "Alice Chen",    email: "alice@example.com",   phone: "+1-555-0101" },
  { name: "Bob Marley",    email: "bob@example.com",     phone: "+1-555-0102" },
  { name: "Carol White",   email: "carol@example.com",   phone: "+1-555-0103" },
  { name: "David Kim",     email: "david@example.com",   phone: "+1-555-0104" },
  { name: "Eve Johnson",   email: "eve@example.com",     phone: "+1-555-0105" },
];

/* ─── CSV PARSER ───────────────────────────────────────────────────────────── */
function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (!lines.length) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim().replace(/"/g, ""));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
    return { name: obj.name || obj.fullname || "", email: obj.email || "", phone: obj.phone || obj.mobile || "" };
  }).filter((c) => c.name || c.email);
}

/* ─── MAIN COMPONENT ───────────────────────────────────────────────────────── */
export default function ContactSyncModal({ children }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { user, setSelectedChat, chats, setChats } = ChatState();
  const { colors, isCyberpunk } = useTheme();
  const toast = useToast();

  const [contacts, setContacts]       = useState([]);
  const [matched, setMatched]         = useState([]);
  const [unmatched, setUnmatched]     = useState([]);
  const [loading, setLoading]         = useState(false);
  const [synced, setSynced]           = useState(false);
  const [chatLoading, setChatLoading] = useState(null);
  const [manualEmail, setManualEmail] = useState("");
  const [manualName, setManualName]   = useState("");
  const [tab, setTab]                 = useState(0);

  /* ── helpers ── */
  const accent   = isCyberpunk ? "#b84bff" : colors.accent;
  const accentDim = isCyberpunk ? "#b84bff22" : colors.accentDim;
  const modalBg  = colors.modalBg;
  const border   = isCyberpunk ? "#b84bff44" : colors.border;
  const textCol  = colors.text;
  const subText  = colors.subText;

  /* ── load phone contacts via Web Contacts API ── */
  const loadPhoneContacts = async () => {
    if (!("contacts" in navigator && "ContactsManager" in window)) {
      toast({ title: "Phone contacts not supported in this browser", description: "Use the manual or CSV import instead.", status: "info", duration: 4000, position: "top" });
      return;
    }
    try {
      const props = ["name", "email", "tel"];
      const opts  = { multiple: true };
      const raw   = await navigator.contacts.select(props, opts);
      const parsed = raw.map((c) => ({
        name:  (c.name  || [])[0] || "",
        email: (c.email || [])[0] || "",
        phone: (c.tel   || [])[0] || "",
      })).filter((c) => c.name || c.email);
      setContacts(parsed);
      toast({ title: `${parsed.length} contacts imported`, status: "success", duration: 2500, position: "top" });
    } catch (err) {
      toast({ title: "Could not access contacts", description: err.message, status: "error", duration: 3000, position: "top" });
    }
  };

  /* ── load demo contacts ── */
  const loadDemoContacts = () => {
    setContacts(DEMO_CONTACTS);
    setSynced(false);
    setMatched([]);
    setUnmatched([]);
    toast({ title: "Demo contacts loaded (5)", status: "success", duration: 2000, position: "top" });
  };

  /* ── CSV file import ── */
  const handleCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      setContacts(parsed);
      setSynced(false);
      setMatched([]);
      setUnmatched([]);
      toast({ title: `${parsed.length} contacts imported from CSV`, status: "success", duration: 2500, position: "top" });
    };
    reader.readAsText(file);
  };

  /* ── add contact manually ── */
  const addManual = () => {
    if (!manualEmail.trim()) return;
    const c = { name: manualName.trim() || manualEmail.trim(), email: manualEmail.trim(), phone: "" };
    setContacts((prev) => [...prev, c]);
    setManualEmail("");
    setManualName("");
    setSynced(false);
    toast({ title: "Contact added", status: "success", duration: 1500, position: "top" });
  };

  /* ── sync / match ── */
  const syncContacts = async () => {
    if (!contacts.length) {
      toast({ title: "No contacts to sync", status: "warning", duration: 2500, position: "top" });
      return;
    }
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await api.post("/api/user/contacts/match", { contacts }, config);
      setMatched(data.matched);
      setUnmatched(data.unmatched);
      setSynced(true);
      setTab(data.matched.length > 0 ? 0 : 1);
      toast({
        title: `Sync complete — ${data.matched.length} on Talker, ${data.unmatched.length} not yet`,
        status: "success", duration: 3000, position: "top",
      });
    } catch {
      toast({ title: "Sync failed", status: "error", duration: 3000, position: "top" });
    } finally {
      setLoading(false);
    }
  };

  /* ── start chat with a matched user ── */
  const startChat = async (userId) => {
    try {
      setChatLoading(userId);
      const config = { headers: { "Content-type": "application/json", Authorization: `Bearer ${user.token}` } };
      const { data } = await api.post("/api/chat", { userId }, config);
      if (!chats.find((c) => c._id === data._id)) setChats([data, ...chats]);
      setSelectedChat(data);
      onClose();
    } catch {
      toast({ title: "Could not open chat", status: "error", duration: 3000, position: "top" });
    } finally {
      setChatLoading(null);
    }
  };

  /* ── invite ── */
  const invite = (contact) => {
    const msg = `Hey ${contact.name || "there"}! Join me on Talker – https://talker.app`;
    if (navigator.share) {
      navigator.share({ title: "Join Talker", text: msg }).catch(() => {});
    } else {
      navigator.clipboard.writeText(msg).then(() =>
        toast({ title: "Invite link copied!", status: "info", duration: 2000, position: "top" })
      );
    }
  };

  /* ── reset ── */
  const reset = () => {
    setContacts([]);
    setMatched([]);
    setUnmatched([]);
    setSynced(false);
  };

  /* ── cyber glow helper ── */
  const cyberGlow = isCyberpunk
    ? { boxShadow: `0 0 12px ${accent}55`, border: `1px solid ${accent}55` }
    : {};

  return (
    <>
      <span onClick={onOpen} style={{ cursor: "pointer" }}>{children}</span>

      <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
        <ModalOverlay backdropFilter="blur(6px)" />
        <ModalContent bg={modalBg} borderColor={border} borderWidth="1px" {...cyberGlow} borderRadius="xl">
          {/* ── Header ── */}
          <ModalHeader
            borderBottomWidth="1px" borderColor={border}
            color={textCol}
            fontFamily={isCyberpunk ? "'Orbitron', monospace" : undefined}
            style={isCyberpunk ? { textShadow: `0 0 8px ${accent}` } : undefined}
            pb={3}
          >
            <Flex align="center" gap={2}>
              <Text fontSize="xl">📱</Text>
              <Text>{isCyberpunk ? "CONTACT SYNC" : "Contact Sync"}</Text>
              {contacts.length > 0 && (
                <Badge bg={accent} color="white" borderRadius="full" px={2} fontSize="xs">
                  {contacts.length}
                </Badge>
              )}
            </Flex>
          </ModalHeader>
          <ModalCloseButton color={subText} />

          <ModalBody py={4} px={5}>

            {/* ── Import Section ── */}
            {!synced && (
              <VStack spacing={4} align="stretch">
                <Text fontSize="sm" color={subText}>
                  Import your contacts and find friends already on Talker.
                </Text>

                {/* Import buttons */}
                <Flex gap={2} wrap="wrap">
                  <Button
                    size="sm" leftIcon={<span>📲</span>}
                    onClick={loadPhoneContacts}
                    bg={accent} color="white"
                    _hover={{ filter: "brightness(1.15)" }}
                    borderRadius="lg" flex="1" minW="120px"
                  >
                    Phone Contacts
                  </Button>
                  <Button
                    size="sm" leftIcon={<span>📄</span>}
                    as="label" htmlFor="csv-upload"
                    bg={colors.chatItem || "#2d2d3d"} color={textCol}
                    border={`1px solid ${border}`}
                    _hover={{ bg: accentDim }} cursor="pointer"
                    borderRadius="lg" flex="1" minW="100px"
                  >
                    Import CSV
                    <input id="csv-upload" type="file" accept=".csv" hidden onChange={handleCSV} />
                  </Button>
                  <Button
                    size="sm" leftIcon={<span>🎭</span>}
                    onClick={loadDemoContacts}
                    bg={colors.chatItem || "#2d2d3d"} color={subText}
                    border={`1px solid ${border}`}
                    _hover={{ bg: accentDim }}
                    borderRadius="lg" flex="1" minW="90px"
                    title="Load 5 demo contacts to test the feature"
                  >
                    Demo
                  </Button>
                </Flex>

                <Divider borderColor={border} />

                {/* Manual add */}
                <Box>
                  <Text fontSize="xs" color={subText} mb={2} fontWeight="600" textTransform="uppercase" letterSpacing="wider">
                    Add manually
                  </Text>
                  <Flex gap={2} direction={{ base: "column", sm: "row" }}>
                    <Input
                      placeholder="Name (optional)"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      bg={colors.inputBg} color={textCol}
                      borderColor={border}
                      _focus={{ borderColor: accent, boxShadow: `0 0 0 1px ${accent}` }}
                      _placeholder={{ color: subText }}
                      size="sm" borderRadius="lg"
                    />
                    <Input
                      placeholder="Email address"
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addManual()}
                      bg={colors.inputBg} color={textCol}
                      borderColor={border}
                      _focus={{ borderColor: accent, boxShadow: `0 0 0 1px ${accent}` }}
                      _placeholder={{ color: subText }}
                      size="sm" borderRadius="lg"
                    />
                    <Button
                      size="sm" onClick={addManual} bg={accent} color="white"
                      _hover={{ filter: "brightness(1.1)" }} borderRadius="lg" minW="60px"
                    >
                      Add
                    </Button>
                  </Flex>
                </Box>

                {/* Pending contacts list */}
                {contacts.length > 0 && (
                  <Box>
                    <Flex justify="space-between" align="center" mb={2}>
                      <Text fontSize="xs" color={subText} fontWeight="600" textTransform="uppercase" letterSpacing="wider">
                        Ready to sync ({contacts.length})
                      </Text>
                      <Button size="xs" variant="ghost" color="red.400" onClick={reset}>Clear all</Button>
                    </Flex>
                    <Box
                      maxH="160px" overflowY="auto"
                      borderRadius="lg" border={`1px solid ${border}`}
                      bg={colors.chatBg}
                      css={{ "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { background: accent + "66", borderRadius: "4px" } }}
                    >
                      {contacts.map((c, i) => (
                        <Flex key={i} px={3} py={2} align="center" gap={3}
                          borderBottom={i < contacts.length - 1 ? `1px solid ${border}40` : "none"}>
                          <Box
                            w="32px" h="32px" borderRadius="full"
                            bg={accent + "33"} display="flex" alignItems="center" justifyContent="center"
                            fontSize="sm" fontWeight="bold" color={accent} flexShrink={0}
                          >
                            {(c.name || c.email || "?")[0].toUpperCase()}
                          </Box>
                          <Box flex="1" minW={0}>
                            <Text fontSize="sm" color={textCol} fontWeight="500" isTruncated>{c.name || "(no name)"}</Text>
                            <Text fontSize="xs" color={subText} isTruncated>{c.email || c.phone}</Text>
                          </Box>
                          <Tooltip label="Remove">
                            <IconButton
                              icon={<span>×</span>}
                              size="xs" variant="ghost" color={subText}
                              _hover={{ color: "red.400" }}
                              onClick={() => setContacts((prev) => prev.filter((_, j) => j !== i))}
                              aria-label="Remove contact"
                            />
                          </Tooltip>
                        </Flex>
                      ))}
                    </Box>
                  </Box>
                )}
              </VStack>
            )}

            {/* ── Results Section ── */}
            {synced && (
              <VStack spacing={4} align="stretch">
                {/* Stats bar */}
                <Flex gap={3} wrap="wrap">
                  <Box flex="1" minW="100px" borderRadius="xl" bg={accent + "22"} border={`1px solid ${accent}44`} p={3} textAlign="center">
                    <Text fontSize="2xl" fontWeight="800" color={accent}>{matched.length}</Text>
                    <Text fontSize="xs" color={subText}>On Talker</Text>
                  </Box>
                  <Box flex="1" minW="100px" borderRadius="xl" bg={colors.chatItem || "#2d2d3d"} border={`1px solid ${border}`} p={3} textAlign="center">
                    <Text fontSize="2xl" fontWeight="800" color={textCol}>{unmatched.length}</Text>
                    <Text fontSize="xs" color={subText}>Not yet</Text>
                  </Box>
                  <Box flex="1" minW="100px" borderRadius="xl" bg={colors.chatItem || "#2d2d3d"} border={`1px solid ${border}`} p={3} textAlign="center">
                    <Text fontSize="2xl" fontWeight="800" color={textCol}>{contacts.length}</Text>
                    <Text fontSize="xs" color={subText}>Total synced</Text>
                  </Box>
                </Flex>

                <Tabs index={tab} onChange={setTab} variant="soft-rounded" size="sm">
                  <TabList gap={2} mb={1}>
                    <Tab
                      _selected={{ bg: accent, color: "white" }}
                      color={subText} borderRadius="full"
                      fontFamily={isCyberpunk ? "'Orbitron', monospace" : undefined}
                      fontSize="xs"
                    >
                      ✅ On Talker {matched.length > 0 && `(${matched.length})`}
                    </Tab>
                    <Tab
                      _selected={{ bg: colors.chatItem || "#444", color: textCol }}
                      color={subText} borderRadius="full"
                      fontFamily={isCyberpunk ? "'Orbitron', monospace" : undefined}
                      fontSize="xs"
                    >
                      📨 Invite {unmatched.length > 0 && `(${unmatched.length})`}
                    </Tab>
                  </TabList>

                  <TabPanels>
                    {/* Matched */}
                    <TabPanel px={0} py={2}>
                      {matched.length === 0 ? (
                        <Box textAlign="center" py={8} color={subText}>
                          <Text fontSize="3xl" mb={2}>🤷</Text>
                          <Text fontSize="sm">None of your contacts are on Talker yet.</Text>
                        </Box>
                      ) : (
                        <VStack spacing={2} align="stretch"
                          maxH="280px" overflowY="auto"
                          css={{ "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { background: accent + "66", borderRadius: "4px" } }}
                        >
                          {matched.map((m) => (
                            <Flex
                              key={m._id} align="center" gap={3}
                              p={3} borderRadius="xl"
                              bg={colors.chatItem || "#2d2d3d"}
                              border={`1px solid ${border}`}
                              _hover={{ borderColor: accent, bg: accentDim }}
                              transition="all 0.2s"
                            >
                              <Avatar size="sm" name={m.name} src={m.pic} />
                              <Box flex="1" minW={0}>
                                <Text fontSize="sm" fontWeight="600" color={textCol} isTruncated>
                                  {m.contactName !== m.name ? `${m.contactName} ` : ""}{m.name}
                                </Text>
                                <Text fontSize="xs" color={subText} isTruncated>{m.email}</Text>
                              </Box>
                              <Badge bg={accent + "33"} color={accent} fontSize="9px" px={2} py={1} borderRadius="full">
                                TALKER
                              </Badge>
                              <Button
                                size="xs" bg={accent} color="white"
                                _hover={{ filter: "brightness(1.15)" }}
                                borderRadius="lg"
                                isLoading={chatLoading === m._id}
                                onClick={() => startChat(m._id)}
                                fontFamily={isCyberpunk ? "'Orbitron', monospace" : undefined}
                              >
                                Chat
                              </Button>
                            </Flex>
                          ))}
                        </VStack>
                      )}
                    </TabPanel>

                    {/* Unmatched / invite */}
                    <TabPanel px={0} py={2}>
                      {unmatched.length === 0 ? (
                        <Box textAlign="center" py={8} color={subText}>
                          <Text fontSize="3xl" mb={2}>🎉</Text>
                          <Text fontSize="sm">All your contacts are already on Talker!</Text>
                        </Box>
                      ) : (
                        <VStack spacing={2} align="stretch"
                          maxH="280px" overflowY="auto"
                          css={{ "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { background: accent + "66", borderRadius: "4px" } }}
                        >
                          {unmatched.map((c, i) => (
                            <Flex
                              key={i} align="center" gap={3}
                              p={3} borderRadius="xl"
                              bg={colors.chatItem || "#2d2d3d"}
                              border={`1px solid ${border}`}
                              transition="all 0.2s"
                            >
                              <Box
                                w="32px" h="32px" borderRadius="full"
                                bg={border} display="flex" alignItems="center"
                                justifyContent="center" fontSize="sm" fontWeight="bold"
                                color={subText} flexShrink={0}
                              >
                                {(c.name || c.email || "?")[0].toUpperCase()}
                              </Box>
                              <Box flex="1" minW={0}>
                                <Text fontSize="sm" fontWeight="600" color={textCol} isTruncated>{c.name || "(no name)"}</Text>
                                <Text fontSize="xs" color={subText} isTruncated>{c.email}</Text>
                              </Box>
                              <Button
                                size="xs"
                                bg="transparent"
                                color={accent}
                                border={`1px solid ${accent}66`}
                                _hover={{ bg: accentDim }}
                                borderRadius="lg"
                                onClick={() => invite(c)}
                                fontFamily={isCyberpunk ? "'Orbitron', monospace" : undefined}
                              >
                                Invite
                              </Button>
                            </Flex>
                          ))}
                        </VStack>
                      )}
                    </TabPanel>
                  </TabPanels>
                </Tabs>

                <Button
                  size="sm" variant="ghost" color={subText}
                  _hover={{ color: textCol, bg: accentDim }}
                  borderRadius="lg"
                  onClick={() => { setSynced(false); setTab(0); }}
                >
                  ← Back to import
                </Button>
              </VStack>
            )}
          </ModalBody>

          <ModalFooter borderTopWidth="1px" borderColor={border} gap={3} pt={3}>
            {!synced ? (
              <>
                <Button variant="ghost" size="sm" onClick={onClose} color={subText} borderRadius="lg">
                  Cancel
                </Button>
                <Button
                  size="sm" onClick={syncContacts}
                  bg={accent} color="white"
                  _hover={{ filter: "brightness(1.1)" }}
                  isLoading={loading}
                  loadingText="Syncing…"
                  borderRadius="lg"
                  isDisabled={contacts.length === 0}
                  fontFamily={isCyberpunk ? "'Orbitron', monospace" : undefined}
                  style={isCyberpunk ? { boxShadow: `0 0 12px ${accent}88` } : undefined}
                >
                  {isCyberpunk ? "⚡ SYNC" : "⚡ Sync Contacts"}
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={onClose} bg={accent} color="white"
                _hover={{ filter: "brightness(1.1)" }} borderRadius="lg" ml="auto">
                Done
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
