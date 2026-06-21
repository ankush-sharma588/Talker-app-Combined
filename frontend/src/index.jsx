import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { ChakraProvider } from "@chakra-ui/react";
import ChatProvider from "./Context/ChatProvider";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./Context/ThemeContext";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <ChatProvider>
      <ThemeProvider>
        <ChakraProvider>
          <App />
        </ChakraProvider>
      </ThemeProvider>
    </ChatProvider>
  </BrowserRouter>
);
