import { Button, FormControl, FormLabel, Input, InputGroup, InputRightElement, VStack, useToast } from "@chakra-ui/react";
import { useState } from "react";
import api from "../../config/api";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../Context/ThemeContext";

export default function Signup() {
  const [show, setShow] = useState(false);
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState("");
  const [pic, setPic] = useState(null); const [loading, setLoading] = useState(false);
  const toast = useToast(); const navigate = useNavigate();
  const { colors } = useTheme();

  const inp = {
    bg: colors.inputBg, border: "1px solid", borderColor: colors.border,
    color: colors.text, _placeholder: { color: colors.subText },
    _focus: { borderColor: colors.accent, boxShadow: `0 0 0 1px ${colors.accent}` },
    _hover: { borderColor: colors.accent }, transition: "all 0.2s",
  };

  const uploadPic = (file) => {
    if (!file) return;
    if (!["image/jpeg","image/png","image/webp"].includes(file.type)) {
      toast({ title: "JPEG/PNG/WebP only", status: "warning", duration: 3000, position: "top" }); return;
    }
    const data = new FormData();
    data.append("file", file); data.append("upload_preset", "talker-app"); data.append("cloud_name", "your_cloud_name");
    fetch("https://api.cloudinary.com/v1_1/your_cloud_name/image/upload", { method: "post", body: data })
      .then((r) => r.json()).then((d) => setPic(d.url?.toString()))
      .catch(() => toast({ title: "Image upload failed", status: "warning", duration: 3000, position: "top" }));
  };

  const submit = async () => {
    if (!name || !email || !password || !confirm) {
      toast({ title: "Fill all fields", status: "warning", duration: 3000, position: "top" }); return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", status: "warning", duration: 3000, position: "top" }); return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/api/user", { name, email, password, pic }, { headers: { "Content-type": "application/json" } });
      localStorage.setItem("userInfo", JSON.stringify(data)); navigate("/chats");
    } catch (e) {
      toast({ title: e.response?.data?.message || "Registration failed", status: "error", duration: 3000, position: "top" });
      setLoading(false);
    }
  };

  return (
    <VStack spacing={4}>
      {[
        { label: "Name", type: "text", ph: "Ankush", set: setName },
        { label: "Email", type: "email", ph: "you@example.com", set: setEmail },
      ].map(({ label, type, ph, set }) => (
        <FormControl key={label} isRequired>
          <FormLabel fontSize="sm" fontWeight="500" color={colors.text}>{label}</FormLabel>
          <Input {...inp} type={type} placeholder={ph} onChange={(e) => set(e.target.value)} />
        </FormControl>
      ))}
      {["Password", "Confirm Password"].map((label, idx) => (
        <FormControl key={label} isRequired>
          <FormLabel fontSize="sm" fontWeight="500" color={colors.text}>{label}</FormLabel>
          <InputGroup>
            <Input {...inp} type={show ? "text" : "password"} placeholder="••••••••"
              onChange={(e) => (idx === 0 ? setPassword : setConfirm)(e.target.value)} />
            <InputRightElement w="4rem">
              <Button size="xs" variant="ghost" color={colors.subText} onClick={() => setShow((s) => !s)}>
                {show ? "Hide" : "Show"}
              </Button>
            </InputRightElement>
          </InputGroup>
        </FormControl>
      ))}
      <FormControl>
        <FormLabel fontSize="sm" fontWeight="500" color={colors.text}>Profile Picture (optional)</FormLabel>
        <Input {...inp} type="file" accept="image/*" p={1} onChange={(e) => uploadPic(e.target.files[0])} />
      </FormControl>
      <Button w="100%" bg={colors.accent} color="white" _hover={{ filter: "brightness(1.12)" }}
        onClick={submit} isLoading={loading} fontWeight="600" borderRadius="lg">
        Create Account
      </Button>
    </VStack>
  );
}
