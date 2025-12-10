import { create } from "zustand";
import { api } from "@/lib/api";
import { Conversation, CallStatus } from "@/types";

interface ConversationState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  loading: boolean;
  fetchConversations: (filters?: {
    status?: CallStatus;
    agentId?: string;
    leadId?: string;
  }) => Promise<void>;
  fetchConversationById: (id: string) => Promise<void>;
  playRecording: (recordingUrl: string) => void;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  loading: false,

  fetchConversations: async (filters) => {
    set({ loading: true });
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append("status", filters.status);
      if (filters?.agentId) params.append("agentId", filters.agentId);
      if (filters?.leadId) params.append("leadId", filters.leadId);

      const response = await api.get(`/conversations?${params.toString()}`);
      set({ conversations: response.data || [] });
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  fetchConversationById: async (id: string) => {
    set({ loading: true });
    try {
      const response = await api.get(`/conversations/${id}`);
      set({ currentConversation: response.data || null });
    } catch (error) {
      console.error("Failed to fetch conversation:", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  playRecording: (recordingUrl: string) => {
    // Open recording in new tab or play inline
    window.open(recordingUrl, "_blank");
  },
}));
