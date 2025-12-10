"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";

interface AnimatedVoiceOrbProps {
  className?: string;
  agentId: string;
  onConversationStart?: () => void;
  onConversationEnd?: () => void;
  onStopConversation?: (stopFn: () => Promise<void>) => void;
}

export function AnimatedVoiceOrb({
  className,
  agentId,
  onConversationStart,
  onConversationEnd,
  onStopConversation,
}: AnimatedVoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const volumeRef = useRef(0);

  // Audio analysis setup
  const setupAudioAnalysis = useCallback((audioElement: HTMLAudioElement) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const analyser = audioContextRef.current.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    const source = audioContextRef.current.createMediaElementSource(audioElement);
    source.connect(analyser);
    analyser.connect(audioContextRef.current.destination);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateVolume = () => {
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        volumeRef.current = average / 255; // Normalize to 0-1
      }
      requestAnimationFrame(updateVolume);
    };

    updateVolume();
  }, []);

  // Stop conversation
  const stopConversation = useCallback(async () => {
    setIsConnected(false);
    setIsAgentSpeaking(false);
    onConversationEnd?.();
  }, [onConversationEnd]);

  useEffect(() => {
    if (onStopConversation) {
      onStopConversation(stopConversation);
    }
  }, [stopConversation, onStopConversation]);

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    let animationFrameId: number;
    let rotation = 0;
    let pulseScale = 1;
    let targetScale = 1;

    const draw = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const baseRadius = Math.min(centerX, centerY) * 0.65;

      // React to audio volume when agent is speaking
      if (isConnected && isAgentSpeaking) {
        targetScale = 1 + volumeRef.current * 0.3; // Scale based on volume
      } else if (isConnected) {
        targetScale = 1 + Math.sin(Date.now() / 500) * 0.05;
      } else {
        targetScale = 1;
      }

      // Smooth transition
      pulseScale += (targetScale - pulseScale) * 0.1;

      const radius = baseRadius * pulseScale;

      // Create gradient
      const gradient = ctx.createConicGradient(rotation, centerX, centerY);
      gradient.addColorStop(0, "#818cf8"); // indigo-400
      gradient.addColorStop(0.33, "#c084fc"); // purple-400
      gradient.addColorStop(0.66, "#60a5fa"); // blue-400
      gradient.addColorStop(1, "#818cf8"); // indigo-400

      // Draw orb with blur
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.shadowColor = "#60a5fa";
      ctx.shadowBlur = 50;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fill();
      ctx.restore();

      // Add highlight
      const highlightGradient = ctx.createRadialGradient(
        centerX - radius * 0.5,
        centerY - radius * 0.5,
        0,
        centerX,
        centerY,
        radius
      );
      highlightGradient.addColorStop(0, "rgba(255, 255, 255, 0.15)");
      highlightGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = highlightGradient;
      ctx.fill();

      // Update rotation speed based on state
      rotation += isConnected ? 0.02 : 0.01;
      if (rotation >= Math.PI * 2) {
        rotation = 0;
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isConnected, isAgentSpeaking]);

  const startConversation = async () => {
    try {
      setIsConnecting(true);
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Start conversation
      setIsConnected(true);
      setIsConnecting(false);
      onConversationStart?.();
    } catch (error) {
      console.error("Failed to start conversation:", error);
      alert("Не удалось получить доступ к микрофону");
      setIsConnecting(false);
    }
  };

  return (
    <div className={cn("relative w-full aspect-square", className)}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block" }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {!isConnected ? (
          <Button
            size="lg"
            className="rounded-full bg-white/90 hover:bg-white shadow-2xl px-8 py-8 text-primary cursor-pointer"
            onClick={startConversation}
            disabled={isConnecting}
          >
            <div className="bg-primary p-3 rounded-full mr-3">
              <Mic className="h-6 w-6 text-white" />
            </div>
            <span className="text-lg font-semibold">
              {isConnecting ? "Подключение..." : "Начать разговор"}
            </span>
          </Button>
        ) : (
          <div className="text-center">
            <p className="text-sm font-medium rounded-full bg-white/90 shadow-lg px-6 py-3 text-primary">
              {isAgentSpeaking ? "🔊 Агент говорит..." : "🎤 Говорите..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
