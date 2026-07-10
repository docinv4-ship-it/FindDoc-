import { useState, useEffect, useRef, useCallback } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useTypingIndicator(supabase: any, conversationId: string | null, currentUserId: string | null) {
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!conversationId || !supabase) return;

    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        "broadcast",
        { event: "typing" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          if (payload.payload?.userId !== currentUserId) {
            setIsOtherTyping(true);
            setTypingUser(payload.payload?.userName || "Someone");

            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
            }

            typingTimeoutRef.current = setTimeout(() => {
              setIsOtherTyping(false);
              setTypingUser(null);
            }, 3000);
          }
        }
      )
      .on(
        "broadcast",
        { event: "stop_typing" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          if (payload.payload?.userId !== currentUserId) {
            setIsOtherTyping(false);
            setTypingUser(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, supabase, currentUserId]);

  const sendTypingSignal = useCallback(() => {
    if (!conversationId || !currentUserId) return;
    supabase?.channel(`typing:${conversationId}`).send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId },
    });
  }, [conversationId, currentUserId, supabase]);

  const sendStopTypingSignal = useCallback(() => {
    if (!conversationId || !currentUserId) return;
    supabase?.channel(`typing:${conversationId}`).send({
      type: "broadcast",
      event: "stop_typing",
      payload: { userId: currentUserId },
    });
  }, [conversationId, currentUserId, supabase]);

  return {
    isOtherTyping,
    typingUser,
    sendTypingSignal,
    sendStopTypingSignal,
  };
}
