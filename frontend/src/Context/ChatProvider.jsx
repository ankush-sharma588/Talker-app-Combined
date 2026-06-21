import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // v6: useNavigate replaces useHistory
import { initPushNotifications } from "../native/push";

const ChatContext = createContext();

const ChatProvider = ({ children }) => {
  const [selectedChat, setSelectedChat] = useState();
  const [user, setUser] = useState();
  const [notification, setNotification] = useState([]);
  const [chats, setChats] = useState();

  const navigate = useNavigate(); // v6

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    setUser(userInfo);
    if (!userInfo) navigate("/"); // v6: navigate() replaces history.push()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Register this device for push notifications once we know who's logged
  // in. Re-runs if `user` changes (e.g. after login navigates here).
  useEffect(() => {
    if (!user?.token) return;
    initPushNotifications(user, (data) => {
      // User tapped a push notification. We don't have the full chat object
      // here, just its id, so route to /chats and let Chatpage's own chat
      // list + selection logic take it from there.
      if (data?.chatId) {
        navigate("/chats", { state: { openChatId: data.chatId } });
      } else {
        navigate("/chats");
      }
    });
  }, [user, navigate]);

  return (
    <ChatContext.Provider
      value={{
        selectedChat,
        setSelectedChat,
        user,
        setUser,
        notification,
        setNotification,
        chats,
        setChats,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const ChatState = () => {
  return useContext(ChatContext);
};

export default ChatProvider;
