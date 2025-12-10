"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Agent } from "@/types";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface TestAgentDialogProps {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TestAgentDialog({
  agent,
  open,
  onOpenChange,
}: TestAgentDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize greeting when dialog opens
  useEffect(() => {
    if (open && messages.length === 0) {
      const greetingMessage = agent.inboundGreetingMessage || "Здравствуйте! Чем могу помочь?";
      setMessages([
        {
          role: "assistant",
          content: greetingMessage,
          timestamp: new Date(),
        },
      ]);
      // Play greeting TTS
      playTTS(greetingMessage);
    }
  }, [open, agent]);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
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

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Не удалось получить доступ к микрофону");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  // Process recorded audio
  const processRecording = async () => {
    if (audioChunksRef.current.length === 0) return;

    setIsProcessing(true);

    try {
      // Create audio blob
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);

      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(",")[1];

        // Step 1: Transcribe audio (STT)
        const transcribeRes = await api.post(
          `/agents/${agent._id}/test/transcribe`,
          { audioBase64: base64Audio }
        );

        const userMessage = transcribeRes.data.transcript;

        if (!userMessage || userMessage.trim() === "") {
          toast.error("Не удалось распознать речь");
          setIsProcessing(false);
          return;
        }

        // Add user message to chat
        setMessages((prev) => [
          ...prev,
          {
            role: "user",
            content: userMessage,
            timestamp: new Date(),
          },
        ]);

        // Step 2: Get AI response
        const chatRes = await api.post(`/agents/${agent._id}/test/chat`, {
          message: userMessage,
          conversationHistory: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        });

        const assistantResponse = chatRes.data.response;

        // Add assistant message to chat
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: assistantResponse,
            timestamp: new Date(),
          },
        ]);

        // Step 3: Play TTS
        await playTTS(assistantResponse);

        setIsProcessing(false);
      };
    } catch (error: any) {
      console.error("Error processing recording:", error);
      toast.error(error.response?.data?.message || "Ошибка обработки аудио");
      setIsProcessing(false);
    }
  };

  // Play TTS audio
  const playTTS = async (text: string) => {
    try {
      const res = await api.post(
        `/agents/${agent._id}/test/synthesize`,
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

  // Save conversation
  const saveConversation = async () => {
    if (messages.length === 0) return;

    setIsSaving(true);

    try {
      await api.post(`/agents/${agent._id}/test/conversation`, {
        conversationHistory: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      toast.success("Разговор сохранен");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving conversation:", error);
      toast.error(error.response?.data?.message || "Ошибка сохранения");
    } finally {
      setIsSaving(false);
    }
  };

  // Clear conversation
  const clearConversation = () => {
    setMessages([]);
    const greetingMessage = agent.inboundGreetingMessage || "Здравствуйте! Чем могу помочь?";
    setMessages([
      {
        role: "assistant",
        content: greetingMessage,
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Тестирование агента: {agent.name}
          </DialogTitle>
          <DialogDescription>
            Нажмите на микрофон, чтобы говорить с агентом. AI ответит голосом.
          </DialogDescription>
        </DialogHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-muted/20 rounded-lg">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <span className="text-xs opacity-70">
                  {message.timestamp.toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Controls */}
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center justify-center gap-4">
            {/* Record button */}
            <Button
              size="lg"
              variant={isRecording ? "destructive" : "default"}
              className="rounded-full h-16 w-16"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
            >
              {isRecording ? (
                <MicOff className="h-6 w-6" />
              ) : isProcessing ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </Button>

            {/* Clear button */}
            <Button
              variant="outline"
              onClick={clearConversation}
              disabled={isRecording || isProcessing}
            >
              <X className="mr-2 h-4 w-4" />
              Очистить
            </Button>

            {/* Save button */}
            <Button
              variant="default"
              onClick={saveConversation}
              disabled={messages.length === 0 || isSaving || isRecording || isProcessing}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Сохранить
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
