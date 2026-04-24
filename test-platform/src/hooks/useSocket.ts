"use client";

import { useEffect, useRef, useCallback } from "react";
import { getSocket, disconnectSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = getSocket();
    return () => {
      disconnectSocket();
    };
  }, []);

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    socketRef.current?.on(event, handler);
    return () => {
      socketRef.current?.off(event, handler);
    };
  }, []);

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { on, emit, socket: socketRef.current };
}
