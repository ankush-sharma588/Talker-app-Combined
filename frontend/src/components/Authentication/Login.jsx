import { Button, FormControl, FormLabel, Input, InputGroup, InputRightElement, VStack, useToast } from "@chakra-ui/react";
import { useState } from "react";
import api from "../../config/api";
import { useNavigate } from "react-router-dom";
import { ChatState } from "../../Context/ChatProvider";
import { useTheme } from "../../Context/ThemeContext";

export default function Login() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const { setUser } = ChatState();
  const { colors } = useTheme();

  const inp = {
    bg: colors.inputBg, border: "1px solid", borderColor: colors.border,
    color: colors.text, _placeholder: { color: colors.subText },
    _focus: { borderColor: colors.accent, boxShadow: `0 0 0 1px ${colors.accent}` },
    _hover: { borderColor: colors.accent },
    transition: "all 0.2s",
  };

  const submit = async () => {
    setLoading(true);
    if (!email || !password) {
      toast({ title: "Fill all fields", status: "warning", duration: 3000, position: "top" });
      setLoading(false); return;
    }
    try {
      const { data } = await api.post("/api/user/login", { email, password }, { headers: { "Content-type": "application/json" } });
      setUser(data); localStorage.setItem("userInfo", JSON.stringify(data));
      navigate("/chats");
    } catch (e) {
      toast({ title: e.response?.data?.message || "Login failed", status: "error", duration: 3000, position: "top" });
      setLoading(false);
    }
  };

  return (
    <><VStack spacing={4}>
      <FormControl isRequired>
        <FormLabel fontSize="sm" fontWeight="500" color={colors.text}>Email</FormLabel>
        <Input {...inp} type="email" placeholder="you@example.com" value={email}
          onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
      </FormControl>
      <FormControl isRequired>
        <FormLabel fontSize="sm" fontWeight="500" color={colors.text}>Password</FormLabel>
        <InputGroup>
          <Input {...inp} type={show ? "text" : "password"} placeholder="••••••••" value={password}
            onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
          <InputRightElement w="4rem">
            <Button size="xs" variant="ghost" color={colors.subText} onClick={() => setShow((s) => !s)}>
                  {show ? "Hide" : "Show"}
          </Button>
        </InputRightElement>
      </InputGroup>
    </FormControl><Button w="100%" bg={colors.accent} color="white"
      _hover={{ filter: "brightness(1.12)" }} _active={{ filter: "brightness(0.9)" }}
      onClick={submit} isLoading={loading} fontWeight="600" borderRadius="lg">
        Sign In
      </Button><Button w="100%" variant="outline" borderColor={colors.border} color={colors.subText}
        _hover={{ borderColor: colors.accent, color: colors.accent }}
        onClick={() => { setEmail("guest@example.com"); setPassword("123456"); } }
        borderRadius="lg">
        Use Guest Account
      </Button>
    </VStack>
  </>
  );
}
