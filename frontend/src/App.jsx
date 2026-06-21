import "./App.css";
import Homepage from "./Pages/Homepage";
import Chatpage from "./Pages/Chatpage";
import { Routes, Route } from "react-router-dom"; // React Router v6

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/chats" element={<Chatpage />} />
      </Routes>
    </div>
  );
}

export default App;
