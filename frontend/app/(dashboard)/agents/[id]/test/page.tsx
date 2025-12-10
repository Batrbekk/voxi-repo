"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AnimatedVoiceOrb } from "@/components/agents/animated-voice-orb";
import { X, PhoneOff, History, Save, ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AgentTestPage() {
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;

  const [hasCallEnded, setHasCallEnded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentName, setAgentName] = useState("Агент");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const stopConversationRef = useRef<(() => Promise<void>) | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load agent info
  useEffect(() => {
    const loadAgent = async () => {
      try {
        const response = await api.get(`/agents/${agentId}`);
        setAgentName(response.data.name);
      } catch (error) {
        console.error("Failed to load agent:", error);
      }
    };
    loadAgent();
  }, [agentId]);

  const handleConversationStart = async () => {
    setHasCallEnded(false);

    // Play greeting
    try {
      const agent = await api.get(`/agents/${agentId}`);
      const greetingMessage = agent.data.inboundGreetingMessage || "Здравствуйте! Чем могу помочь?";

      setMessages([
        {
          role: "assistant",
          content: greetingMessage,
        },
      ]);

      // Synthesize and play greeting
      await playTTS(greetingMessage);

      // Start listening
      await startListening();
    } catch (error) {
      console.error("Failed to start conversation:", error);
      toast.error("Ошибка начала разговора");
    }
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        await processRecording();
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);

      // Auto-stop after 8 seconds to give user time to speak
      recordingTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          stopListening();
        }
      }, 8000);
    } catch (error) {
      console.error("Failed to start listening:", error);
      toast.error("Не удалось получить доступ к микрофону");
    }
  };

  const stopListening = () => {
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processRecording = async () => {
    if (audioChunksRef.current.length === 0) return;

    setIsProcessing(true);

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);

      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(",")[1];

        // Step 1: Transcribe
        const transcribeRes = await api.post(
          `/agents/${agentId}/test/transcribe`,
          { audioBase64: base64Audio }
        );

        const userMessage = transcribeRes.data.transcript;

        if (!userMessage || userMessage.trim() === "") {
          toast.error("Не удалось распознать речь");
          setIsProcessing(false);
          return;
        }

        // Add user message
        setMessages((prev) => [
          ...prev,
          {
            role: "user",
            content: userMessage,
          },
        ]);

        // Step 2: Get AI response
        const chatRes = await api.post(`/agents/${agentId}/test/chat`, {
          message: userMessage,
          conversationHistory: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        });

        const assistantResponse = chatRes.data.response;

        // Add assistant message
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: assistantResponse,
          },
        ]);

        // Step 3: Play TTS
        await playTTS(assistantResponse);

        setIsProcessing(false);

        // Continue listening
        await startListening();
      };
    } catch (error: any) {
      console.error("Error processing recording:", error);
      toast.error(error.response?.data?.message || "Ошибка обработки аудио");
      setIsProcessing(false);
    }
  };

  const playTTS = async (text: string) => {
    try {
      const res = await api.post(
        `/agents/${agentId}/test/synthesize`,
        { text },
        { responseType: "json" }
      );

      const audioBase64 = res.data.audio;

      // Convert base64 to blob
      const byteCharacters = atob(audioBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const audioBlob = new Blob([byteArray], { type: "audio/mpeg" });

      // Play audio
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        toast.error("Ошибка воспроизведения аудио");
      };

      await audio.play();

      // Cleanup
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    } catch (error) {
      console.error("Error playing TTS:", error);
      toast.error("Ошибка воспроизведения аудио");
    }
  };

  const handleConversationEnd = async () => {
    stopListening();
    setHasCallEnded(true);
  };

  const handleStopConversation = useCallback(async () => {
    if (stopConversationRef.current) {
      await stopConversationRef.current();
    }
  }, []);

  const handleSaveConversation = async () => {
    if (messages.length === 0) {
      toast.error("Нет сообщений для сохранения");
      return;
    }

    try {
      await api.post(`/agents/${agentId}/test/conversation`, {
        conversationHistory: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      toast.success("Разговор сохранен");
      router.push("/conversations");
    } catch (error: any) {
      console.error("Error saving conversation:", error);
      toast.error(error.response?.data?.message || "Ошибка сохранения");
    }
  };

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/agents")}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Тестирование агента</h1>
            <p className="text-muted-foreground">{agentName}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/agents")}
          className="rounded-full"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Закрыть</span>
        </Button>
      </div>

      {/* Main content - Orb */}
      <div className="relative min-h-[calc(100vh-16rem)]">
        {/* Decorative background */}
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,transparent)] dark:bg-grid-slate-700/25 -z-10" />
        <div className="absolute inset-0 bg-gradient-radial from-blue-100/20 to-transparent dark:from-blue-900/20 -z-10" />

        <div className="flex flex-col items-center justify-center h-full py-8">
          <div className="relative w-full max-w-xl aspect-square">
            <AnimatedVoiceOrb
              className="absolute inset-0"
              agentId={agentId}
              onConversationStart={handleConversationStart}
              onConversationEnd={handleConversationEnd}
              onStopConversation={(stopFn) =>
                (stopConversationRef.current = stopFn)
              }
            />
          </div>

          {!hasCallEnded && messages.length > 0 && (
            <div className="mt-8 z-10 flex flex-col items-center gap-4">
              {/* Recording/Processing indicator */}
              {isRecording && (
                <div className="flex items-center gap-3 px-6 py-3 bg-red-500/10 border border-red-500/20 rounded-full">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </div>
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    Слушаю... (автостоп через 8 сек)
                  </span>
                </div>
              )}
              {isProcessing && (
                <div className="flex items-center gap-3 px-6 py-3 bg-blue-500/10 border border-blue-500/20 rounded-full">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    Обработка...
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-4">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full shadow-lg"
                  onClick={handleStopConversation}
                >
                  <PhoneOff className="mr-2 h-5 w-5" />
                  Завершить звонок
                </Button>
                {isRecording && (
                  <Button
                    size="lg"
                    variant="destructive"
                    className="rounded-full shadow-lg"
                    onClick={stopListening}
                    disabled={isProcessing}
                  >
                    Остановить запись
                  </Button>
                )}
              </div>
            </div>
          )}

          {hasCallEnded && (
            <div className="flex flex-col items-center gap-4 mt-8 z-10">
              <p className="text-sm text-muted-foreground">
                Звонок завершен
              </p>
              <div className="flex gap-4">
                <Button
                  variant="default"
                  size="lg"
                  className="rounded-full shadow-lg"
                  onClick={handleSaveConversation}
                >
                  <Save className="mr-2 h-5 w-5" />
                  Сохранить разговор
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full shadow-lg"
                  onClick={() => router.push("/conversations")}
                >
                  <History className="mr-2 h-5 w-5" />
                  История звонков
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
