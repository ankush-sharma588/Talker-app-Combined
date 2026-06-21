import { Avatar } from "@chakra-ui/react";
import { Box, Text } from "@chakra-ui/react";

// Fixed: original was reading from ChatState (always showed logged-in user), 
// but this component should display the passed-in user prop
const UserListItem = ({ user, handleFunction }) => {
  return (
    <Box
      onClick={handleFunction}
      cursor="pointer"
      bg="#E8E8E8"
      _hover={{ background: "#38B2AC", color: "white" }}
      w="100%"
      display="flex"    // d → display
      alignItems="center"
      color="black"
      px={3}
      py={2}
      mb={2}
      borderRadius="lg"
    >
      <Avatar mr={2} size="sm" cursor="pointer" name={user.name} src={user.pic} />
      <Box>
        <Text>{user.name}</Text>
        <Text fontSize="xs">
          <b>Email : </b>
          {user.email}
        </Text>
      </Box>
    </Box>
  );
};

export default UserListItem;
