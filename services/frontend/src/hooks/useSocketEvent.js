import { useEffect, useRef } from "react";
import { subscribeSocket } from "@/api/socket";

export function useSocketEvent(eventName, handler) {
  const handlerRef = useRef(handler);

  // Keep ref updated to avoid re-subscribing if handler identity changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!eventName) return;

    // Use a wrapper to call the latest handler
    const eventHandler = (...args) => {
      if (handlerRef.current) {
        handlerRef.current(...args);
      }
    };

    const unsubscribe = subscribeSocket(eventName, eventHandler);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [eventName]);
}
