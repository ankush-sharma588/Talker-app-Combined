import {
  Box, Text, IconButton, HStack, VStack,
  Badge, Spinner, Button, Tooltip, Avatar,
} from "@chakra-ui/react";
import { useEffect, useRef, useState, useCallback } from "react";

const PC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const fmtDuration = (secs) => {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

/* ─── Incoming call popup ────────────────────────────────────────────────── */
export const IncomingCallPopup = ({ fromName, fromPic, isVideo, onAccept, onReject, colors }) => (
  <Box
    position="fixed" top="0" left="0" right="0" zIndex={10001}
    display="flex" justifyContent="center"
  >
    <Box
      mt={6}
      bg={colors.modalBg || "#1e1e2e"}
      border={`1.5px solid ${colors.accent || "#a855f7"}`}
      borderRadius="2xl" p={5} shadow="2xl" minW="300px"
    >
      <VStack spacing={4}>
        <Avatar size="lg" name={fromName} src={fromPic} className="call-ring-avatar" />
        <VStack spacing={0}>
          <Text fontWeight="700" fontSize="md" color={colors.text || "white"}>
            {fromName}
          </Text>
          <Text fontSize="xs" color={colors.subText || "#aaa"}>
            Incoming {isVideo ? "video" : "voice"} call…
          </Text>
        </VStack>
        <HStack spacing={4}>
          <Tooltip label="Decline" hasArrow>
            <IconButton
              icon={<Text fontSize="20px">✕</Text>}
              borderRadius="full" colorScheme="red" size="lg"
              onClick={onReject} aria-label="Decline call"
            />
          </Tooltip>
          <Tooltip label="Accept" hasArrow>
            <IconButton
              icon={<Text fontSize="20px">{isVideo ? "🎥" : "📞"}</Text>}
              borderRadius="full" colorScheme="green" size="lg"
              onClick={onAccept} aria-label="Accept call"
            />
          </Tooltip>
        </HStack>
      </VStack>
    </Box>
  </Box>
);

/* ─── Main Call Overlay ──────────────────────────────────────────────────── */
const CallModal = ({
  isOpen,
  onClose,
  socket,
  user,
  otherUser,    // { _id, name, pic }
  isCaller,     // true = I initiated the call
  isVideoCall,  // true = video, false = voice only
  remoteOffer,  // SDP offer (callee only)
}) => {
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const pcRef           = useRef(null);
  const localStreamRef  = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const timerRef        = useRef(null);

  const [status, setStatus]   = useState("idle");
  // idle | calling | ringing | connecting | connected | ended | rejected | error
  const [errMsg, setErrMsg]   = useState("");
  const [muted, setMuted]     = useState(false);
  const [videoOff, setVideoOff] = useState(!isVideoCall);
  const [duration, setDuration] = useState(0);

  /* cleanup */
  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    pendingCandidatesRef.current = [];
    if (localVideoRef.current)  localVideoRef.current.srcObject  = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    setDuration(0);
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  }, []);

  const handleEnd = useCallback((emitEnd = true) => {
    if (emitEnd && otherUser?._id) {
      socket.emit("call-end", { to: otherUser._id });
    }
    cleanup();
    setStatus("idle");
    setErrMsg("");
    setMuted(false);
    setVideoOff(!isVideoCall);
    onClose();
  }, [otherUser, socket, cleanup, onClose, isVideoCall]);

  const attachPcHandlers = useCallback((pc) => {
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && otherUser?._id) {
        socket.emit("ice-candidate", { candidate, to: otherUser._id });
      }
    };
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (isVideoCall && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      } else if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
      }
      setStatus("connected");
      startTimer();
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") { setErrMsg("Connection failed."); setStatus("error"); }
      if (pc.connectionState === "disconnected" || pc.connectionState === "closed") {
        setStatus((s) => (s === "connected" ? "ended" : s));
      }
    };
  }, [otherUser, socket, isVideoCall, startTimer]);

  /* ── CALLER: place the call ── */
  const placeCall = useCallback(async () => {
    setErrMsg("");
    setStatus("calling");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideoCall ? { width: 640, height: 480 } : false,
      });
      localStreamRef.current = stream;
      if (isVideoCall && localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection(PC_CONFIG);
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      attachPcHandlers(pc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("call-offer", {
        offer, to: otherUser._id, from: user._id,
        fromName: user.name, fromPic: user.pic, isVideo: isVideoCall,
      });
    } catch (e) {
      setErrMsg(e.name === "NotAllowedError" ? "Camera/microphone permission denied." : e.message);
      setStatus("error");
      cleanup();
    }
  }, [otherUser, user, socket, isVideoCall, attachPcHandlers, cleanup]);

  /* ── CALLEE: accept the call ── */
  const acceptCall = useCallback(async () => {
    if (!remoteOffer) return;
    setErrMsg("");
    setStatus("connecting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideoCall ? { width: 640, height: 480 } : false,
      });
      localStreamRef.current = stream;
      if (isVideoCall && localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection(PC_CONFIG);
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      attachPcHandlers(pc);

      await pc.setRemoteDescription(new RTCSessionDescription(remoteOffer));
      for (const c of pendingCandidatesRef.current) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (_) {}
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("call-answer", { answer, to: otherUser._id });
    } catch (e) {
      setErrMsg(e.name === "NotAllowedError" ? "Camera/microphone permission denied." : e.message);
      setStatus("error");
      socket.emit("call-end", { to: otherUser?._id });
      cleanup();
    }
  }, [remoteOffer, otherUser, socket, isVideoCall, attachPcHandlers, cleanup]);

  /* signaling listeners */
  useEffect(() => {
    if (!socket || !isOpen) return;

    const onAnswer = async ({ answer }) => {
      const pc = pcRef.current;
      if (pc && pc.signalingState === "have-local-offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        for (const c of pendingCandidatesRef.current) {
          try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (_) {}
        }
        pendingCandidatesRef.current = [];
      }
    };
    const onIce = async ({ candidate }) => {
      if (!candidate) return;
      const pc = pcRef.current;
      if (pc && pc.remoteDescription) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (_) {}
      } else {
        pendingCandidatesRef.current.push(candidate);
      }
    };
    const onReject = () => { cleanup(); setStatus("rejected"); };
    const onEnd    = () => { cleanup(); setStatus("ended"); };

    socket.on("call-answer", onAnswer);
    socket.on("ice-candidate", onIce);
    socket.on("call-reject", onReject);
    socket.on("call-end", onEnd);
    return () => {
      socket.off("call-answer", onAnswer);
      socket.off("ice-candidate", onIce);
      socket.off("call-reject", onReject);
      socket.off("call-end", onEnd);
    };
  }, [socket, isOpen, cleanup]);

  /* auto-start */
  useEffect(() => {
    if (isOpen && isCaller  && status === "idle") placeCall();
    if (isOpen && !isCaller && remoteOffer && status === "idle") acceptCall();
  // eslint-disable-next-line
  }, [isOpen]);

  useEffect(() => () => cleanup(), [cleanup]);

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = muted));
    setMuted((m) => !m);
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (!stream || !isVideoCall) return;
    stream.getVideoTracks().forEach((t) => (t.enabled = videoOff));
    setVideoOff((v) => !v);
  };

  if (!isOpen) return null;

  const statusLabel = {
    calling: "Calling…",
    ringing: "Ringing…",
    connecting: "Connecting…",
    connected: fmtDuration(duration),
    ended: "Call ended",
    rejected: "Call declined",
    error: "Error",
    idle: "Starting…",
  }[status];

  return (
    <Box position="fixed" inset={0} zIndex={10000} bg="rgba(0,0,0,0.96)" display="flex" flexDir="column">
      {/* top bar */}
      <HStack px={4} py={3} justify="space-between" borderBottom="1px solid rgba(255,255,255,0.08)" flexShrink={0}>
        <HStack spacing={3}>
          <Avatar size="sm" name={otherUser?.name} src={otherUser?.pic} />
          <VStack spacing={0} align="start">
            <HStack spacing={2}>
              <Text fontWeight="700" fontSize="sm" color="white">{otherUser?.name}</Text>
              <Badge
                colorScheme={
                  status === "connected" ? "green" :
                  ["calling", "ringing", "connecting"].includes(status) ? "yellow" :
                  status === "error" ? "red" : "gray"
                }
                fontSize="9px" borderRadius="full" px={2}
              >
                {status === "connected" ? "● LIVE" : statusLabel}
              </Badge>
            </HStack>
            <Text fontSize="xs" color="whiteAlpha.500">
              {isVideoCall ? "Video call" : "Voice call"}
            </Text>
          </VStack>
        </HStack>

        <Button size="sm" colorScheme="red" borderRadius="full" leftIcon={<Text fontSize="12px">☎</Text>} onClick={() => handleEnd(true)}>
          End Call
        </Button>
      </HStack>

      {/* video / audio area */}
      <Box flex={1} display="flex" alignItems="center" justifyContent="center" position="relative" overflow="hidden">
        {isVideoCall ? (
          <>
            <video
              ref={remoteVideoRef} autoPlay playsInline
              style={{
                width: "100%", height: "100%", objectFit: "contain",
                display: status === "connected" ? "block" : "none",
              }}
            />
            <video
              ref={localVideoRef} autoPlay muted playsInline
              style={{
                position: "absolute", bottom: "16px", right: "16px",
                width: "160px", height: "120px", objectFit: "cover",
                borderRadius: "12px", border: "1px solid rgba(255,255,255,0.2)",
                display: ["calling", "connecting", "connected"].includes(status) && !videoOff ? "block" : "none",
                transform: "scaleX(-1)",
              }}
            />
          </>
        ) : (
          <audio ref={remoteAudioRef} autoPlay />
        )}

        {(!isVideoCall || status !== "connected") && status !== "error" && (
          <VStack position="absolute" spacing={4}>
            {!isVideoCall && <Avatar size="2xl" name={otherUser?.name} src={otherUser?.pic} className={status !== "ended" && status !== "rejected" ? "call-ring-avatar" : ""} />}
            {(status === "calling" || status === "ringing" || status === "connecting" || status === "idle") && (
              <Spinner size="md" color="purple.400" thickness="3px" />
            )}
            <Text color="whiteAlpha.700" fontSize="sm">
              {status === "calling" && "Calling…"}
              {status === "connecting" && "Connecting…"}
              {status === "connected" && fmtDuration(duration)}
              {status === "ended" && "Call ended"}
              {status === "rejected" && "Call declined"}
              {status === "idle" && "Starting…"}
            </Text>
            {(status === "ended" || status === "rejected") && (
              <Button colorScheme="purple" size="sm" onClick={() => handleEnd(false)}>Close</Button>
            )}
          </VStack>
        )}

        {status === "error" && (
          <VStack position="absolute" spacing={3} p={6} maxW="320px" textAlign="center"
            bg="rgba(220,38,38,0.15)" border="1px solid rgba(220,38,38,0.4)" borderRadius="xl">
            <Text fontSize="32px">⚠️</Text>
            <Text color="red.300" fontSize="sm">{errMsg}</Text>
            <Button variant="ghost" size="sm" color="whiteAlpha.500" onClick={() => handleEnd(false)}>Close</Button>
          </VStack>
        )}
      </Box>

      {/* call controls */}
      {["calling", "connecting", "connected", "ringing"].includes(status) && (
        <HStack px={4} py={4} justify="center" spacing={4} borderTop="1px solid rgba(255,255,255,0.06)" flexShrink={0}>
          <Tooltip label={muted ? "Unmute" : "Mute"} hasArrow>
            <IconButton
              icon={<Text fontSize="18px">{muted ? "🔇" : "🎙️"}</Text>}
              borderRadius="full" size="lg"
              colorScheme={muted ? "red" : "gray"}
              onClick={toggleMute}
              aria-label="Toggle mute"
            />
          </Tooltip>
          {isVideoCall && (
            <Tooltip label={videoOff ? "Turn camera on" : "Turn camera off"} hasArrow>
              <IconButton
                icon={<Text fontSize="18px">{videoOff ? "📷" : "🎥"}</Text>}
                borderRadius="full" size="lg"
                colorScheme={videoOff ? "red" : "gray"}
                onClick={toggleVideo}
                aria-label="Toggle camera"
              />
            </Tooltip>
          )}
          <Tooltip label="End call" hasArrow>
            <IconButton
              icon={<Text fontSize="18px">☎</Text>}
              borderRadius="full" size="lg" colorScheme="red"
              onClick={() => handleEnd(true)}
              aria-label="End call"
            />
          </Tooltip>
        </HStack>
      )}
    </Box>
  );
};

export default CallModal;
