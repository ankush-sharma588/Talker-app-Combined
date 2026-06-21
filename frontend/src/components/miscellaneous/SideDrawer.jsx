import {
  Box, Button, Text, Menu, MenuButton, MenuDivider, MenuItem, MenuList,
  Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerOverlay,
  Tooltip, Avatar, Input, Spinner, useToast, useDisclosure, Badge, Flex,
} from "@chakra-ui/react";
import { BellIcon, ChevronDownIcon } from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import api from "../../config/api";
import ChatLoading from "../ChatLoading";
import ProfileModal from "./ProfileModal";
import ThemePicker from "./ThemePicker";
import ContactSyncModal from "./ContactSyncModal";
import { getSender } from "../../config/ChatLogics";
import UserListItem from "../userAvatar/UserListItem";
import { ChatState } from "../../Context/ChatProvider";
import { useTheme } from "../../Context/ThemeContext";
import { clearPushNotifications } from "../../native/push";

function SideDrawer() {
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  const { setSelectedChat, user, notification, setNotification, chats, setChats } = ChatState();
  const { colors, isCyberpunk } = useTheme();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const navigate = useNavigate();

  const logoutHandler = () => {
    clearPushNotifications(user?.token); // best-effort; don't block logout on it
    localStorage.removeItem("userInfo");
    navigate("/");
  };

  const handleSearch = async () => {
    if (!search) {
      toast({ title: "Enter a name or email to search", status: "warning", duration: 3000, position: "top" });
      return;
    }
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await api.get(`/api/user?search=${search}`, config);
      setLoading(false);
      setSearchResult(data);
    } catch {
      toast({ title: "Search failed", status: "error", duration: 3000, position: "top" });
      setLoading(false);
    }
  };

  const accessChat = async (userId) => {
    try {
      setLoadingChat(true);
      const config = { headers: { "Content-type": "application/json", Authorization: `Bearer ${user.token}` } };
      const { data } = await api.post(`/api/chat`, { userId }, config);
      if (!chats.find((c) => c._id === data._id)) setChats([data, ...chats]);
      setSelectedChat(data);
      setLoadingChat(false);
      onClose();
    } catch {
      toast({ title: "Could not open chat", status: "error", duration: 3000, position: "top" });
      setLoadingChat(false);
    }
  };

  return (
    <>
      <Box
        display="flex" justifyContent="space-between" alignItems="center"
        bg={colors.header} w="100%" px={3} py={2}
        borderBottom={isCyberpunk ? "1px solid #b84bff44" : `1px solid ${colors.border}`}
        transition="background 0.3s"
        position="relative"
        boxShadow={isCyberpunk ? "0 2px 16px #b84bff22" : undefined}
      >
        {isCyberpunk && (
          <Box
            position="absolute"
            bottom="0" left="0" right="0"
            h="1px"
            className="cyber-header-line"
          />
        )}
        {/* Search trigger */}
        <Tooltip label="Search users" hasArrow placement="bottom-end">
          <Button variant="ghost" onClick={onOpen} size="sm"
            color={colors.subText} _hover={{ bg: colors.accentDim, color: colors.accent }}>
            🔍
            <Text display={{ base: "none", md: "flex" }} px={2} fontSize="sm">Search</Text>
          </Button>
        </Tooltip>

        {/* Brand */}
        <Text
          fontSize="xl"
          fontWeight="800"
          color={isCyberpunk ? "#b84bff" : colors.text}
          letterSpacing={isCyberpunk ? "wider" : "-0.5px"}
          fontFamily={isCyberpunk ? "'Orbitron', monospace" : undefined}
          style={isCyberpunk ? {
            textShadow: "0 0 12px #b84bff, 0 0 24px #b84bff55",
            animation: "cyber-flicker 8s ease-in-out infinite",
          } : undefined}
        >
          ⚡ {isCyberpunk ? "TALKER" : "Talker"}
        </Text>

        <Flex align="center" gap={1}>
          {/* Notifications */}
          <Menu>
            <MenuButton as={Box} cursor="pointer" p={2} borderRadius="lg"
              _hover={{ bg: colors.accentDim }} position="relative">
              <BellIcon color={colors.subText} boxSize={5} />
              {notification.length > 0 && (
                <Badge
                  position="absolute" top="4px" right="4px"
                  bg={colors.accent} color="white" borderRadius="full"
                  fontSize="9px" minW="16px" h="16px"
                  display="flex" alignItems="center" justifyContent="center"
                >
                  {notification.length > 9 ? "9+" : notification.length}
                </Badge>
              )}
            </MenuButton>
            <MenuList bg={colors.modalBg} borderColor={colors.border} shadow="xl" minW="220px">
              {!notification.length
                ? <MenuItem bg="transparent" color={colors.subText} fontSize="sm" _hover={{ bg: colors.chatItem }}>No new messages</MenuItem>
                : notification.map((notif) => (
                    <MenuItem key={notif._id} bg="transparent" color={colors.text} fontSize="sm"
                      _hover={{ bg: colors.chatItem }}
                      onClick={() => { setSelectedChat(notif.chat); setNotification(notification.filter((n) => n !== notif)); }}>
                      {notif.isMention
                        ? `@ ${notif.sender?.name || "Someone"} mentioned you in ${notif.chat.isGroupChat ? notif.chat.chatName : "a chat"}`
                        : notif.chat.isGroupChat
                          ? `📢 ${notif.chat.chatName}`
                          : `💬 ${getSender(user, notif.chat.users)}`}
                    </MenuItem>
                  ))}
            </MenuList>
          </Menu>

          {/* User menu */}
          <Menu>
            <MenuButton as={Button} variant="ghost" size="sm" px={1}
              bg="transparent" color={colors.text}
              _hover={{ bg: colors.accentDim }}
              rightIcon={<ChevronDownIcon color={colors.subText} />}>
              <Avatar size="sm" cursor="pointer" name={user.name} src={user.pic} />
            </MenuButton>
            <MenuList bg={colors.modalBg} borderColor={colors.border} shadow="xl">
              <ProfileModal user={user}>
                <MenuItem bg="transparent" color={colors.text} fontSize="sm"
                  _hover={{ bg: colors.chatItem }}>👤 My Profile</MenuItem>
              </ProfileModal>
              <ThemePicker>
                <MenuItem bg="transparent" color={colors.text} fontSize="sm"
                  _hover={{ bg: colors.chatItem }}>🎨 Appearance</MenuItem>
              </ThemePicker>
              <ContactSyncModal>
                <MenuItem bg="transparent" color={colors.text} fontSize="sm"
                  _hover={{ bg: colors.chatItem }}>📱 Contact Sync</MenuItem>
              </ContactSyncModal>
              <MenuDivider borderColor={colors.border} />
              <MenuItem bg="transparent" color="red.400" fontSize="sm"
                _hover={{ bg: "#ff000012" }} onClick={logoutHandler}>
                🚪 Logout
              </MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </Box>

      {/* Search Drawer */}
      <Drawer placement="left" onClose={onClose} isOpen={isOpen}>
        <DrawerOverlay backdropFilter="blur(4px)" />
        <DrawerContent bg={colors.modalBg} borderRight={`1px solid ${colors.border}`}>
          <DrawerHeader borderBottomWidth="1px" borderColor={colors.border} color={colors.text} fontSize="md">
            🔍 Search Users
          </DrawerHeader>
          <DrawerBody>
            <Box display="flex" pb={3} gap={2}>
              <Input
                placeholder="Name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                bg={colors.inputBg}
                color={colors.text}
                borderColor={colors.border}
                _focus={{ borderColor: colors.accent, boxShadow: `0 0 0 1px ${colors.accent}` }}
                _placeholder={{ color: colors.subText }}
                size="sm"
                borderRadius="lg"
              />
              <Button onClick={handleSearch} size="sm" bg={colors.accent} color="white"
                _hover={{ filter: "brightness(1.1)" }}>
                Go
              </Button>
            </Box>
            {loading ? <ChatLoading /> : searchResult?.map((u) => (
              <UserListItem key={u._id} user={u} handleFunction={() => accessChat(u._id)} />
            ))}
            {loadingChat && <Spinner ml="auto" display="flex" color={colors.accent} />}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export default SideDrawer;
