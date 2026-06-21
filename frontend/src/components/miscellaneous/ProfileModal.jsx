import { ViewIcon, InfoIcon, EmailIcon, CalendarIcon } from "@chakra-ui/icons";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter,
  ModalBody, ModalCloseButton, Button, useDisclosure, IconButton,
  Text, Image, Box, Tabs, TabList, TabPanels, Tab, TabPanel,
  Badge, Divider, VStack, HStack,
} from "@chakra-ui/react";
import { useTheme } from "../../Context/ThemeContext";

const ProfileModal = ({ user, children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { colors } = useTheme();

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "N/A";

  return (
    <>
      {children ? (
        <span onClick={onOpen}>{children}</span>
      ) : (
        <IconButton icon={<ViewIcon />} onClick={onOpen} />
      )}

      <Modal size="lg" onClose={onClose} isOpen={isOpen} isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg={colors.modalBg} borderColor={colors.border} borderWidth="1px">
          <ModalHeader
            fontSize="2xl"
            fontFamily="Work sans"
            fontWeight="bold"
            display="flex"
            justifyContent="center"
            color={colors.text}
            pb={2}
          >
            {user.name}
          </ModalHeader>
          <ModalCloseButton color={colors.text} />

          <ModalBody px={6} pb={4}>
            <Box display="flex" flexDir="column" alignItems="center" mb={4}>
              <Image
                borderRadius="full"
                boxSize="120px"
                src={user.pic}
                alt={user.name}
                border="4px solid"
                borderColor="teal.400"
                shadow="md"
              />
              <Badge colorScheme="teal" mt={2} px={3} py={1} borderRadius="full" fontSize="sm">
                Active
              </Badge>
            </Box>

            <Tabs isFitted variant="enclosed" colorScheme="teal">
              <TabList mb={4} borderColor={colors.border}>
                <Tab color={colors.subText} _selected={{ color: "teal.400", borderColor: "teal.400" }}>
                  Profile
                </Tab>
                <Tab color={colors.subText} _selected={{ color: "teal.400", borderColor: "teal.400" }}>
                  Info &amp; About
                </Tab>
              </TabList>

              <TabPanels>
                {/* Profile Tab */}
                <TabPanel px={0}>
                  <VStack spacing={4} align="stretch">
                    <HStack spacing={3} p={3} bg={colors.chatItem} borderRadius="lg">
                      <EmailIcon color="teal.400" boxSize={5} />
                      <VStack align="flex-start" spacing={0}>
                        <Text fontSize="xs" color={colors.subText}>Email</Text>
                        <Text fontWeight="medium" color={colors.text}>{user.email}</Text>
                      </VStack>
                    </HStack>

                    <HStack spacing={3} p={3} bg={colors.chatItem} borderRadius="lg">
                      <InfoIcon color="teal.400" boxSize={5} />
                      <VStack align="flex-start" spacing={0}>
                        <Text fontSize="xs" color={colors.subText}>Full Name</Text>
                        <Text fontWeight="medium" color={colors.text}>{user.name}</Text>
                      </VStack>
                    </HStack>
                  </VStack>
                </TabPanel>

                {/* Info & About Tab */}
                <TabPanel px={0}>
                  <VStack spacing={4} align="stretch">
                    <Box p={4} bg={colors.chatItem} borderRadius="lg">
                      <Text fontSize="sm" fontWeight="bold" color="teal.400" mb={2}>
                        About
                      </Text>
                      <Text fontSize="sm" color={colors.text}>
                        {user.about || "Hey there! I am using Talk-A-Tive. 👋"}
                      </Text>
                    </Box>

                    <Divider borderColor={colors.border} />

                    <HStack spacing={3} p={3} bg={colors.chatItem} borderRadius="lg">
                      <CalendarIcon color="teal.400" boxSize={5} />
                      <VStack align="flex-start" spacing={0}>
                        <Text fontSize="xs" color={colors.subText}>Member Since</Text>
                        <Text fontWeight="medium" color={colors.text}>{joinDate}</Text>
                      </VStack>
                    </HStack>

                    <Box p={3} bg={colors.chatItem} borderRadius="lg">
                      <Text fontSize="xs" color={colors.subText} mb={1}>User ID</Text>
                      <Text fontSize="xs" fontFamily="mono" color={colors.subText} isTruncated>
                        {user._id}
                      </Text>
                    </Box>

                    <Box p={3} bg={colors.chatItem} borderRadius="lg">
                      <Text fontSize="xs" color={colors.subText} mb={2}>Privacy</Text>
                      <HStack spacing={2} flexWrap="wrap">
                        <Badge colorScheme="green" fontSize="xs">End-to-End Encrypted</Badge>
                        <Badge colorScheme="blue" fontSize="xs">Verified</Badge>
                      </HStack>
                    </Box>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>

          <ModalFooter borderTopWidth="1px" borderColor={colors.border}>
            <Button onClick={onClose} colorScheme="teal" variant="outline">Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ProfileModal;
