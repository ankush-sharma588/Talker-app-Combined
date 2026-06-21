import { Box } from "@chakra-ui/react";
import "./styles.css";
import SingleChat from "./SingleChat";
import { ChatState } from "../Context/ChatProvider";
import { useTheme } from "../Context/ThemeContext";

const Chatbox = ({ fetchAgain, setFetchAgain }) => {
  const { selectedChat } = ChatState();
  const { colors } = useTheme();

  return (
    <Box
      display={{ base: selectedChat ? "flex" : "none", md: "flex" }}
      alignItems="center"
      flexDir="column"
      p={0}
      bg={colors.bg}
      w={{ base: "100%", md: "68%" }}
      h="100%"
      borderRadius="lg"
      borderWidth="1px"
      borderColor={colors.border}
      overflow="hidden"
      transition="all 0.3s"
    >
      <SingleChat fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
    </Box>
  );
};

export default Chatbox;
