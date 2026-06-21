import { Box } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Chatbox from "../components/Chatbox";
import MyChats from "../components/MyChats";
import SideDrawer from "../components/miscellaneous/SideDrawer";
import { ChatState } from "../Context/ChatProvider";
import { useTheme } from "../Context/ThemeContext";
import { useViewportHeight } from "../hooks/useViewportHeight";

const Chatpage = () => {
  const [fetchAgain, setFetchAgain] = useState(false);
  const { user, chats, setSelectedChat } = ChatState();
  const { colors } = useTheme();
  const location = useLocation();
  const viewportHeight = useViewportHeight();

  // If we arrived here because the user tapped a push notification for a
  // specific chat (see ChatProvider's initPushNotifications callback), open
  // that chat automatically once the chat list has loaded.
  useEffect(() => {
    const openChatId = location.state?.openChatId;
    if (!openChatId || !chats) return;
    const target = chats.find((c) => c._id === openChatId);
    if (target) setSelectedChat(target);
  }, [location.state, chats, setSelectedChat]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      width="100%"
      height={`${viewportHeight}px`}
      bg={colors.bg}
      transition="background 0.3s"
      overflow="hidden"
    >
      {/* SideDrawer's real rendered height drives this layout instead of a
          guessed vh percentage — flex="0 0 auto" means it takes exactly the
          space its content needs, and the chat area below gets the rest. */}
      {user && <Box flex="0 0 auto"><SideDrawer /></Box>}
      <Box
        display="flex"
        justifyContent="space-between"
        flex="1 1 auto"
        minHeight={0}
        p="10px"
        gap="10px"
        bg={colors.bg}
        transition="background 0.3s"
        overflow="hidden"
      >
        {user && <MyChats fetchAgain={fetchAgain} />}
        {user && <Chatbox fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />}
      </Box>
    </Box>
  );
};

export default Chatpage;
