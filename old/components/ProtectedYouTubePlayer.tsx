"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Gauge, Settings } from "lucide-react";

export function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export function getYouTubeThumbnail(url: string | null | undefined): string | null {
  if (!url) return null;
  const videoId = getYouTubeId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
}

export function getMaterialCoverImage(mat: {
  material_imageurl?: string | null;
  material_video_url?: string | null;
  material_link?: string | null;
} | null | undefined): string | null {
  if (!mat) return null;
  if (mat.material_imageurl && mat.material_imageurl.trim() !== "") {
    return mat.material_imageurl;
  }
  const videoThumb = getYouTubeThumbnail(mat.material_video_url);
  if (videoThumb) return videoThumb;

  const linkThumb = getYouTubeThumbnail(mat.material_link);
  if (linkThumb) return linkThumb;

  return null;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
  }
}

import { useAuth } from "@/src/lib/useAuth";

interface ProtectedYouTubePlayerProps {
  url: string;
  watermarkText?: string;
  className?: string;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const QUALITY_LABELS: Record<string, string> = {
  auto: "Auto",
  hd1080: "1080p HD",
  hd720: "720p HD",
  large: "480p",
  medium: "360p",
  small: "240p",
  tiny: "144p",
};

export default function ProtectedYouTubePlayer({ url, watermarkText, className = "" }: ProtectedYouTubePlayerProps) {
  const { user } = useAuth();
  const displayWatermark = watermarkText || (user?.student_id ? `Lashinigeo - ${user.student_id}` : "Lashinigeo Protected");
  const videoId = getYouTubeId(url);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentQuality, setCurrentQuality] = useState("auto");
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // Load YouTube Iframe API script if needed
  useEffect(() => {
    if (!videoId) return;

    const initPlayer = () => {
      if (!iframeRef.current) return;
      
      // Clean up previous instance
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }

      playerRef.current = new window.YT.Player(iframeRef.current, {
        videoId,
        playerVars: {
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          playsinline: 1,
          autohide: 1,
        },
        events: {
          onReady: (event: any) => {
            setIsReady(true);
            setDuration(event.target.getDuration());
            if (event.target.getAvailableQualityLevels) {
              const qualities = event.target.getAvailableQualityLevels();
              if (Array.isArray(qualities) && qualities.length > 0) {
                setAvailableQualities(qualities);
              }
            }
          },
          onStateChange: (event: any) => {
            // YT.PlayerState.PLAYING = 1, PAUSED = 2, ENDED = 0
            if (event.data === 1) setIsPlaying(true);
            else setIsPlaying(false);
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const existingScript = document.getElementById("youtube-iframe-api");
      if (!existingScript) {
        const tag = document.createElement("script");
        tag.id = "youtube-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);
      }

      const prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevReady) prevReady();
        initPlayer();
      };
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
    };
  }, [videoId]);

  // Sync progress timer & state
  useEffect(() => {
    let interval: any;
    if (isPlaying && playerRef.current && playerRef.current.getCurrentTime) {
      interval = setInterval(() => {
        setCurrentTime(playerRef.current.getCurrentTime() || 0);
        setDuration(playerRef.current.getDuration() || 0);
        if (playerRef.current.getAvailableQualityLevels) {
          const qualities = playerRef.current.getAvailableQualityLevels();
          if (Array.isArray(qualities) && qualities.length > 0) {
            setAvailableQualities(qualities);
          }
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  if (!videoId) {
    return (
      <div className={`p-4 bg-default-100 rounded-lg text-center ${className}`}>
        <p className="text-default-500 text-sm">Invalid video URL</p>
      </div>
    );
  }

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
    setShowSpeedMenu(false);
    setShowQualityMenu(false);
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(newTime, true);
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (playerRef.current && playerRef.current.setPlaybackRate) {
      playerRef.current.setPlaybackRate(rate);
    }
    setShowSpeedMenu(false);
  };

  const handleQualityChange = (quality: string) => {
    setCurrentQuality(quality);
    if (playerRef.current && playerRef.current.setPlaybackQuality) {
      playerRef.current.setPlaybackQuality(quality);
    }
    setShowQualityMenu(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  const formatTime = (sec: number) => {
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-video rounded-lg overflow-hidden bg-black select-none group shadow-xl ${className}`}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* YouTube Iframe container - cropped scale hides top/bottom letterboxing black bars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden bg-black">
        <div 
          ref={iframeRef} 
          className="absolute w-[130%] h-[130%] -top-[15%] -left-[15%] pointer-events-none object-cover" 
        />
      </div>

      {/* Moving Watermark Overlay */}
      <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
        <div className="absolute text-white/30 text-xl md:text-2xl font-bold select-none animate-watermark-roam drop-shadow-md whitespace-nowrap">
          {displayWatermark}
        </div>
      </div>

      {/* Click-to-toggle play overlay */}
      <div
        className="absolute inset-0 z-10 cursor-pointer flex items-center justify-center"
        onClick={togglePlay}
        onContextMenu={(e) => e.preventDefault()}
      >
        {!isPlaying && isReady && (
          <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white shadow-2xl transition-transform transform group-hover:scale-110">
            <Play className="w-8 h-8 fill-current ml-1" />
          </div>
        )}
      </div>

      {/* Custom Control Bar (Play/Pause, Scrubber, Speed, Quality, Fullscreen) */}
      <div 
        className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 pt-6 flex flex-col gap-2 opacity-100 transition-opacity duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bar */}
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary hover:h-2 transition-all"
        />

        <div className="flex items-center justify-between text-white text-xs px-1">
          <div className="flex items-center gap-3">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              type="button"
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors focus:outline-none"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            {/* Mute Button */}
            <button
              onClick={toggleMute}
              type="button"
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors focus:outline-none"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Time display */}
            <span className="font-mono text-white/90 text-xs">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Playback Speed Menu Button */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSpeedMenu(!showSpeedMenu);
                  setShowQualityMenu(false);
                }}
                type="button"
                className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 transition-colors text-xs font-semibold flex items-center gap-1 focus:outline-none"
                title="Playback Speed"
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>{playbackRate}x</span>
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-9 right-0 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg shadow-xl py-1 min-w-[90px] z-50 flex flex-col text-xs">
                  <span className="px-3 py-1 text-[10px] uppercase font-bold text-white/50 border-b border-white/10">Speed</span>
                  {SPEED_OPTIONS.map((rate) => (
                    <button
                      key={rate}
                      onClick={() => handleSpeedChange(rate)}
                      className={`px-3 py-1.5 text-left hover:bg-white/20 transition-colors ${
                        playbackRate === rate ? "text-primary font-bold bg-white/10" : "text-white"
                      }`}
                    >
                      {rate}x {rate === 1 ? "(Normal)" : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quality Selector Menu Button */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowQualityMenu(!showQualityMenu);
                  setShowSpeedMenu(false);
                }}
                type="button"
                className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 transition-colors text-xs font-semibold flex items-center gap-1 focus:outline-none"
                title="Video Quality"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{QUALITY_LABELS[currentQuality] || currentQuality}</span>
              </button>

              {showQualityMenu && (
                <div className="absolute bottom-9 right-0 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg shadow-xl py-1 min-w-[110px] z-50 flex flex-col text-xs">
                  <span className="px-3 py-1 text-[10px] uppercase font-bold text-white/50 border-b border-white/10">Quality</span>
                  {(availableQualities.length > 0 ? availableQualities : ["auto", "hd1080", "hd720", "large", "medium"]).map((q) => (
                    <button
                      key={q}
                      onClick={() => handleQualityChange(q)}
                      className={`px-3 py-1.5 text-left hover:bg-white/20 transition-colors ${
                        currentQuality === q ? "text-primary font-bold bg-white/10" : "text-white"
                      }`}
                    >
                      {QUALITY_LABELS[q] || q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              type="button"
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors focus:outline-none"
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes watermark-roam {
          0% { top: 5%; left: 5%; transform: rotate(-5deg); }
          20% { top: 20%; left: 65%; transform: rotate(8deg); }
          40% { top: 60%; left: 75%; transform: rotate(-10deg); }
          60% { top: 75%; left: 10%; transform: rotate(5deg); }
          80% { top: 35%; left: 45%; transform: rotate(-3deg); }
          100% { top: 5%; left: 5%; transform: rotate(-5deg); }
        }
        .animate-watermark-roam {
          animation: watermark-roam 60s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
