import {
  Box, Text, IconButton, HStack, VStack,
  Badge, Spinner, Button, Tooltip,
} from "@chakra-ui/react";
import { useEffect, useRef, useState, useCallback } from "react";
import { IS_NATIVE } from "../config/env";

const PC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// navigator.mediaDevices.getDisplayMedia() does not exist on Android
// Chrome/WebView — it's a desktop-browser-only API. There is no JS-only way
// around this: Android screen capture requires the native MediaProjection
// system API (see ScreenSharePlugin.java + NATIVE_SCREEN_SHARE.md). Viewing
// someone else's shared screen is unaffected — that's just playing an
// incoming WebRTC video track, which works identically on Android.
const CAN_SHARE_SCREEN_HERE =
  typeof navigator !== "undefined" &&
  navigator.mediaDevices &&
  typeof navigator.mediaDevices.getDisplayMedia === "function";

/* ─── Incoming request popup ─────────────────────────────────────────────── */
export const IncomingShareBanner = ({ fromName, onAccept, onReject, colors }) => (
  <Box
    position="fixed" bottom="90px" right="20px" zIndex={9999}
    bg={colors.modalBg || "#1e1e2e"}
    border={`1.5px solid ${colors.accent || "#a855f7"}`}
    borderRadius="xl" p={4} shadow="2xl" minW="270px"
  >
    <VStack spacing={3} align="stretch">
      <HStack spacing={2}>
        <Text fontSize="22px">🖥️</Text>
        <VStack spacing={0} align="start">
          <Text fontWeight="700" fontSize="sm" color={colors.text || "white"}>
            Screen Share Request
          </Text>
          <Text fontSize="xs" color={colors.subText || "#aaa"}>
            <b>{fromName}</b> wants to share their screen
          </Text>
        </VStack>
      </HStack>
      <HStack spacing={2} justify="flex-end">
        <Button size="xs" colorScheme="red" variant="outline" onClick={onReject}>
          Decline
        </Button>
        <Button size="xs" colorScheme="green" onClick={onAccept}>
          Accept
        </Button>
      </HStack>
    </VStack>
  </Box>
);

/* ─── Main Screen Share Overlay ──────────────────────────────────────────── */
const ScreenShareModal = ({
  isOpen,
  onClose,
  socket,
  user,
  otherUser,   // { _id, name }
  isSharer,    // true = I share, false = I view
  remoteOffer, // SDP offer (viewer only)
}) => {
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef          = useRef(null);
  const streamRef      = useRef(null);

  const [status, setStatus] = useState("idle");
  // idle | connecting | connected | ended | error
  const [errMsg, setErrMsg] = useState("");

  /* cleanup */
  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (localVideoRef.current)  localVideoRef.current.srcObject  = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  const handleClose = useCallback(() => {
    if (isSharer && otherUser?._id) {
      socket.emit("screen-share-end", { to: otherUser._id });
    }
    cleanup();
    setStatus("idle");
    setErrMsg("");
    onClose();
  }, [isSharer, otherUser, socket, cleanup, onClose]);

  /* ── SHARER: start ── */
  const startSharing = useCallback(async () => {
    setErrMsg("");
    if (!CAN_SHARE_SCREEN_HERE) {
      // Android (and iOS) WebViews have no getDisplayMedia(). The native
      // ScreenSharePlugin (MediaProjection-based) is the real fix for this
      // — see NATIVE_SCREEN_SHARE.md. Until that plugin's WebRTC bridge is
      // wired up for your specific WebRTC native SDK version, surface a
      // clear message instead of a cryptic "not a function" crash.
      setErrMsg(
        IS_NATIVE
          ? "Sharing your screen from this device isn't available in this build yet. You can still view someone else's shared screen."
          : "Screen sharing isn't supported in this browser."
      );
      setStatus("error");
      return;
    }
    setStatus("connecting");
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: false,
      });
      streamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection(PC_CONFIG);
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.onicecandidate = ({ candidate }) => {
        if (candidate && otherUser?._id)
          socket.emit("ice-candidate", { candidate, to: otherUser._id });
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setStatus("connected");
        if (["disconnected", "failed", "closed"].includes(pc.connectionState))
          setStatus("ended");
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("screen-share-offer", {
        offer, to: otherUser._id, from: user._id, fromName: user.name,
      });

      socket.once("screen-share-answer", async ({ answer }) => {
        if (pc.signalingState === "have-local-offer")
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        setStatus("connected");
      });

      stream.getVideoTracks()[0].onended = () => handleClose();
    } catch (e) {
      setErrMsg(e.name === "NotAllowedError" ? "Permission denied." : e.message);
      setStatus("error");
      cleanup();
    }
  }, [otherUser, user, socket, cleanup, handleClose]);

  /* ── VIEWER: accept ── */
  const acceptShare = useCallback(async () => {
    if (!remoteOffer) return;
    setErrMsg("");
    setStatus("connecting");
    try {
      const pc = new RTCPeerConnection(PC_CONFIG);
      pcRef.current = pc;

      pc.onicecandidate = ({ candidate }) => {
        if (candidate && otherUser?._id)
          socket.emit("ice-candidate", { candidate, to: otherUser._id });
      };
      pc.ontrack = ({ streams }) => {
        if (remoteVideoRef.current && streams[0]) {
          remoteVideoRef.current.srcObject = streams[0];
          setStatus("connected");
        }
      };
      pc.onconnectionstatechange = () => {
        if (["disconnected", "failed", "closed"].includes(pc.connectionState))
          setStatus("ended");
      };

      await pc.setRemoteDescription(new RTCSessionDescription(remoteOffer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("screen-share-answer", { answer, to: otherUser._id });
    } catch (e) {
      setErrMsg(e.message || "Connection failed.");
      setStatus("error");
      cleanup();
    }
  }, [remoteOffer, otherUser, socket, cleanup]);

  /* ICE from remote + share-end */
  useEffect(() => {
    if (!socket || !isOpen) return;
    const onIce = async ({ candidate }) => {
      try { if (pcRef.current && candidate) await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); }
      catch (_) {}
    };
    const onEnd = () => { cleanup(); setStatus("ended"); };
    socket.on("ice-candidate",    onIce);
    socket.on("screen-share-end", onEnd);
    return () => { socket.off("ice-candidate", onIce); socket.off("screen-share-end", onEnd); };
  }, [socket, isOpen, cleanup]);

  /* auto-start */
  useEffect(() => {
    if (isOpen && isSharer  && status === "idle") startSharing();
    if (isOpen && !isSharer && remoteOffer && status === "idle") acceptShare();
  // eslint-disable-next-line
  }, [isOpen]);

  useEffect(() => () => cleanup(), [cleanup]);

  if (!isOpen) return null;

  return (
    <Box
      position="fixed" inset={0} zIndex={10000}
      bg="rgba(0,0,0,0.96)"
      display="flex" flexDir="column"
    >
      {/* top bar */}
      <HStack
        px={4} py={3} justify="space-between"
        borderBottom="1px solid rgba(255,255,255,0.08)"
        flexShrink={0}
      >
        <HStack spacing={3}>
          <Text fontSize="20px">🖥️</Text>
          <VStack spacing={0} align="start">
            <HStack spacing={2}>
              <Text fontWeight="700" fontSize="sm" color="white">
                {isSharer ? "You are sharing your screen" : `${otherUser?.name}'s Screen`}
              </Text>
              <Badge
                colorScheme={
                  status === "connected" ? "green" :
                  status === "connecting" ? "yellow" :
                  status === "ended" ? "red" : "gray"
                }
                fontSize="9px" borderRadius="full" px={2}
              >
                {status === "connected" ? "● LIVE" :
                 status === "connecting" ? "Connecting…" :
                 status === "ended" ? "Ended" :
                 status === "error" ? "Error" : "Idle"}
              </Badge>
            </HStack>
            <Text fontSize="xs" color="whiteAlpha.500">
              {isSharer ? `Sharing with ${otherUser?.name}` : "Viewing shared screen"}
            </Text>
          </VStack>
        </HStack>

        <Button
          size="sm" colorScheme="red" borderRadius="full"
          leftIcon={<Text fontSize="12px">■</Text>}
          onClick={handleClose}
        >
          {isSharer ? "Stop Sharing" : "Close"}
        </Button>
      </HStack>

      {/* video area */}
      <Box flex={1} display="flex" alignItems="center" justifyContent="center" position="relative" overflow="hidden">
        {/* sharer preview */}
        <video
          ref={localVideoRef} autoPlay muted playsInline
          style={{
            width: "100%", height: "100%", objectFit: "contain",
            display: isSharer && (status === "connected" || status === "connecting") ? "block" : "none",
          }}
        />
        {/* viewer remote */}
        <video
          ref={remoteVideoRef} autoPlay playsInline
          style={{
            width: "100%", height: "100%", objectFit: "contain",
            display: !isSharer && status === "connected" ? "block" : "none",
          }}
        />

        {status === "connecting" && (
          <VStack position="absolute" spacing={4}>
            <Spinner size="xl" color="purple.400" thickness="3px" />
            <Text color="whiteAlpha.600" fontSize="sm">
              {isSharer ? "Waiting for other person to accept…" : "Connecting…"}
            </Text>
          </VStack>
        )}
        {status === "ended" && (
          <VStack position="absolute" spacing={4}>
            <Text fontSize="48px">🖥️</Text>
            <Text color="whiteAlpha.700" fontSize="lg" fontWeight="600">Screen share ended</Text>
            <Button colorScheme="purple" size="sm" onClick={handleClose}>Close</Button>
          </VStack>
        )}
        {status === "error" && (
          <VStack
            position="absolute" spacing={3} p={6} maxW="320px" textAlign="center"
            bg="rgba(220,38,38,0.15)" border="1px solid rgba(220,38,38,0.4)" borderRadius="xl"
          >
            <Text fontSize="32px">⚠️</Text>
            <Text color="red.300" fontSize="sm">{errMsg}</Text>
            {isSharer && <Button colorScheme="red" size="sm" onClick={startSharing}>Retry</Button>}
            <Button variant="ghost" size="sm" color="whiteAlpha.500" onClick={handleClose}>Close</Button>
          </VStack>
        )}
        {status === "idle" && !errMsg && (
          <VStack position="absolute" spacing={3}>
            <Spinner size="lg" color="purple.400" />
            <Text color="whiteAlpha.500" fontSize="sm">Starting…</Text>
          </VStack>
        )}
      </Box>

      {/* bottom hint */}
      {status === "connected" && (
        <Box
          px={4} py={2} borderTop="1px solid rgba(255,255,255,0.06)"
          textAlign="center" flexShrink={0}
        >
          <Text fontSize="11px" color="whiteAlpha.400">
            {isSharer
              ? "Your screen is live. Click 'Stop Sharing' to end."
              : "You are viewing a shared screen."}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default ScreenShareModal;
