"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Maximize2 } from "lucide-react";

interface SessionReplayProps {
  events: string | null;
}

export default function SessionReplay({ events }: SessionReplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerLoaded, setPlayerLoaded] = useState(false);
  const playerRef = useRef<unknown>(null);

  useEffect(() => {
    if (!events || !containerRef.current) return;

    let parsedEvents: unknown[];
    try {
      parsedEvents = JSON.parse(events);
    } catch {
      return;
    }

    if (parsedEvents.length === 0) return;

    // Dynamic import of rrweb-player
    import("rrweb-player").then(({ default: RRWebPlayer }) => {
      if (!containerRef.current) return;
      containerRef.current.innerHTML = "";

      playerRef.current = new RRWebPlayer({
        target: containerRef.current,
        props: {
          events: parsedEvents as ConstructorParameters<typeof RRWebPlayer>[0]["props"]["events"],
          width: containerRef.current.offsetWidth,
          height: 400,
          autoPlay: false,
          showController: true,
          speedOption: [1, 2, 4, 8],
        },
      });

      setPlayerLoaded(true);
    }).catch((err) => {
      console.error("Failed to load rrweb-player:", err);
    });

    return () => {
      playerRef.current = null;
    };
  }, [events]);

  if (!events) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <Play className="w-12 h-12 mb-4 opacity-30" />
        <p className="text-sm">No session recording available</p>
        <p className="text-xs text-gray-600 mt-1">
          Session replay will appear here when recording is enabled
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="bg-gray-950 rounded-lg border border-gray-800 overflow-hidden min-h-[400px]"
      />
      {!playerLoaded && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          <span className="ml-3 text-sm text-gray-400">Loading replay...</span>
        </div>
      )}
      {playerLoaded && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const p = playerRef.current as { goto?: (t: number) => void };
                p?.goto?.(0);
              }}
              className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsPlaying(!isPlaying);
                const p = playerRef.current as { play?: () => void; pause?: () => void };
                if (isPlaying) p?.pause?.();
                else p?.play?.();
              }}
              className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                const p = playerRef.current as { goto?: (t: number) => void };
                p?.goto?.(999999);
              }}
              className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
          <button className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
