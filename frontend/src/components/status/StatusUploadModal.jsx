import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Button, Box, Text, Textarea, Select, Image, Progress,
  useToast, VStack, HStack, AspectRatio,
} from "@chakra-ui/react";
import { useState, useRef } from "react";
import api from "../../config/api";
import { ChatState } from "../../Context/ChatProvider";
import { useTheme } from "../../Context/ThemeContext";

function StatusUploadModal({ isOpen, onClose, onSuccess }) {
  const { user } = ChatState();
  const { colors } = useTheme();
  const toast = useToast();
  const fileRef = useRef();

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState("everyone");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file) {
      toast({ title: "Please select a file", status: "warning", duration: 2500, position: "top" });
      return;
    }
    const formData = new FormData();
    formData.append("media", file);
    formData.append("caption", caption);
    formData.append("privacy", privacy);

    try {
      setUploading(true);
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 100)),
      };
      await api.post("/api/status", formData, config);
      toast({ title: "Status posted!", status: "success", duration: 2500, position: "top" });
      onSuccess();
      handleClose();
    } catch (err) {
      toast({ title: err.response?.data?.message || "Upload failed", status: "error", duration: 3000, position: "top" });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setCaption("");
    setPrivacy("everyone");
    onClose();
  };

  const isVideo = file?.type?.startsWith("video");

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md" isCentered>
      <ModalOverlay backdropFilter="blur(6px)" />
      <ModalContent bg={colors.modalBg} borderColor={colors.border} border="1px solid" borderRadius="2xl">
        <ModalHeader color={colors.text} fontSize="md" fontWeight="700" borderBottom={`1px solid ${colors.border}`}>
          📸 Add Status
        </ModalHeader>
        <ModalBody py={4}>
          <VStack spacing={4}>
            <Box
              w="100%" borderRadius="xl" overflow="hidden" cursor="pointer"
              border={`2px dashed ${preview ? "transparent" : colors.border}`}
              bg={preview ? "transparent" : colors.inputBg}
              onClick={() => !preview && fileRef.current.click()}
              minH="200px" display="flex" alignItems="center" justifyContent="center"
              position="relative" transition="all 0.2s"
              _hover={!preview ? { borderColor: colors.accent } : {}}
            >
              {!preview ? (
                <VStack spacing={2} color={colors.subText}>
                  <Text fontSize="3xl">📁</Text>
                  <Text fontSize="sm">Click to select image or video</Text>
                  <Text fontSize="xs" opacity={0.7}>Max 50MB • JPEG, PNG, GIF, WebP, MP4, WebM</Text>
                </VStack>
              ) : isVideo ? (
                <AspectRatio ratio={16 / 9} w="100%">
                  <video src={preview} controls style={{ borderRadius: "12px" }} />
                </AspectRatio>
              ) : (
                <Image src={preview} maxH="280px" objectFit="contain" borderRadius="xl" w="100%" />
              )}
              {preview && (
                <Button
                  size="xs" position="absolute" top={2} right={2}
                  colorScheme="red" onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                >✕</Button>
              )}
            </Box>

            <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={handleFile} />

            {preview && (
              <Button size="xs" variant="ghost" color={colors.subText} onClick={() => fileRef.current.click()}>
                Change file
              </Button>
            )}

            <Textarea
              placeholder="Add a caption… (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              resize="none" rows={2} size="sm"
              bg={colors.inputBg} color={colors.text}
              borderColor={colors.border} borderRadius="lg"
              _placeholder={{ color: colors.subText }}
              _focus={{ borderColor: colors.accent, boxShadow: `0 0 0 1px ${colors.accent}` }}
            />

            <HStack w="100%" spacing={3}>
              <Text fontSize="sm" color={colors.subText} whiteSpace="nowrap">👁 Visible to:</Text>
              <Select
                value={privacy} onChange={(e) => setPrivacy(e.target.value)}
                size="sm" bg={colors.inputBg} color={colors.text}
                borderColor={colors.border} borderRadius="lg"
                _focus={{ borderColor: colors.accent }}
              >
                <option value="everyone">Everyone</option>
                <option value="contacts">My Contacts</option>
                <option value="nobody">Only Me</option>
              </Select>
            </HStack>

            {uploading && <Progress value={progress} w="100%" colorScheme="purple" borderRadius="full" size="sm" />}
          </VStack>
        </ModalBody>
        <ModalFooter gap={2} borderTop={`1px solid ${colors.border}`}>
          <Button size="sm" variant="ghost" onClick={handleClose} color={colors.subText}>Cancel</Button>
          <Button
            size="sm" bg={colors.accent} color="white"
            _hover={{ filter: "brightness(1.1)" }}
            onClick={handleSubmit} isLoading={uploading} loadingText="Uploading…"
          >Post Status</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default StatusUploadModal;
