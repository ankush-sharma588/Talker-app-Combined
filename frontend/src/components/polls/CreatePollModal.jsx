import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  ModalFooter, Button, FormControl, FormLabel, Input, VStack, HStack,
  IconButton, Switch, Text, useToast, Box,
} from "@chakra-ui/react";
import { AddIcon, DeleteIcon } from "@chakra-ui/icons";
import { useState } from "react";
import api from "../../config/api";
import { ChatState } from "../../Context/ChatProvider";
import { useTheme } from "../../Context/ThemeContext";

const CreatePollModal = ({ isOpen, onClose, onPollCreated }) => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isMultiple, setIsMultiple] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { user, selectedChat } = ChatState();
  const { colors } = useTheme();

  const handleAddOption = () => {
    if (options.length < 8) setOptions([...options, ""]);
  };

  const handleRemoveOption = (idx) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== idx));
  };

  const handleOptionChange = (idx, val) => {
    const copy = [...options];
    copy[idx] = val;
    setOptions(copy);
  };

  const handleSubmit = async () => {
    if (!question.trim()) {
      toast({ title: "Enter a question", status: "warning", duration: 2000, position: "top" });
      return;
    }
    const filtered = options.filter((o) => o.trim());
    if (filtered.length < 2) {
      toast({ title: "Add at least 2 options", status: "warning", duration: 2000, position: "top" });
      return;
    }
    try {
      setLoading(true);
      const config = { headers: { "Content-type": "application/json", Authorization: `Bearer ${user.token}` } };
      const { data } = await api.post("/api/poll", {
        chatId: selectedChat._id,
        question: question.trim(),
        options: filtered,
        isMultipleChoice: isMultiple,
      }, config);
      onPollCreated(data);
      setQuestion("");
      setOptions(["", ""]);
      setIsMultiple(false);
      onClose();
    } catch (err) {
      toast({ title: err?.response?.data?.message || "Failed to create poll", status: "error", duration: 3000, position: "top" });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setQuestion("");
    setOptions(["", ""]);
    setIsMultiple(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered size="md">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent bg={colors.sidebarBg} color={colors.text} border={`1px solid ${colors.accent}44`}>
        <ModalHeader
          borderBottom={`1px solid ${colors.accent}33`}
          fontSize="lg"
          fontWeight="bold"
          color={colors.accent}
        >
          📊 Create Group Poll
        </ModalHeader>
        <ModalCloseButton color={colors.text} />
        <ModalBody py={4}>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel color={colors.textMuted} fontSize="sm">Question</FormLabel>
              <Input
                placeholder="Ask something..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                bg={colors.inputBg}
                color={colors.text}
                border={`1px solid ${colors.accent}44`}
                _focus={{ borderColor: colors.accent, boxShadow: `0 0 0 1px ${colors.accent}` }}
                _placeholder={{ color: colors.textMuted }}
              />
            </FormControl>

            <FormControl>
              <FormLabel color={colors.textMuted} fontSize="sm">Options</FormLabel>
              <VStack spacing={2} align="stretch">
                {options.map((opt, idx) => (
                  <HStack key={idx}>
                    <Input
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      bg={colors.inputBg}
                      color={colors.text}
                      border={`1px solid ${colors.accent}33`}
                      _focus={{ borderColor: colors.accent, boxShadow: `0 0 0 1px ${colors.accent}` }}
                      _placeholder={{ color: colors.textMuted }}
                      size="sm"
                    />
                    {options.length > 2 && (
                      <IconButton
                        icon={<DeleteIcon />}
                        size="sm"
                        variant="ghost"
                        color={colors.textMuted}
                        onClick={() => handleRemoveOption(idx)}
                        _hover={{ color: "red.400" }}
                      />
                    )}
                  </HStack>
                ))}
              </VStack>
              {options.length < 8 && (
                <Button
                  leftIcon={<AddIcon />}
                  size="xs"
                  mt={2}
                  variant="ghost"
                  color={colors.accent}
                  onClick={handleAddOption}
                  _hover={{ bg: colors.accentDim }}
                >
                  Add Option
                </Button>
              )}
            </FormControl>

            <HStack justify="space-between" pt={1}>
              <Text color={colors.textMuted} fontSize="sm">Allow multiple choices</Text>
              <Switch
                isChecked={isMultiple}
                onChange={(e) => setIsMultiple(e.target.checked)}
                colorScheme="purple"
              />
            </HStack>
          </VStack>
        </ModalBody>
        <ModalFooter borderTop={`1px solid ${colors.accent}22`} gap={2}>
          <Button variant="ghost" onClick={handleClose} color={colors.textMuted} size="sm">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={loading}
            size="sm"
            bg={colors.accent}
            color="white"
            _hover={{ bg: colors.accentHover }}
          >
            Create Poll
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CreatePollModal;
