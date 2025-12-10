import { create } from "zustand";
import { api } from "@/lib/api";
import { Lead, LeadStatus } from "@/types";

interface LeadState {
  leads: Lead[];
  loading: boolean;
  fetchLeads: (filters?: {
    status?: LeadStatus;
    search?: string;
    agentId?: string;
  }) => Promise<void>;
  createLead: (data: Partial<Lead>) => Promise<void>;
  updateLead: (id: string, data: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  assignLeadToAgent: (leadId: string, agentId: string) => Promise<void>;
}

export const useLeadStore = create<LeadState>((set, get) => ({
  leads: [],
  loading: false,

  fetchLeads: async (filters) => {
    set({ loading: true });
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append("status", filters.status);
      if (filters?.search) params.append("search", filters.search);
      if (filters?.agentId) params.append("agentId", filters.agentId);

      const response = await api.get(`/leads?${params.toString()}`);
      set({ leads: Array.isArray(response.data) ? response.data : [] });
    } catch (error) {
      console.error("Failed to fetch leads:", error);
      set({ leads: [] }); // Ensure leads is always an array even on error
    } finally {
      set({ loading: false });
    }
  },

  createLead: async (data) => {
    try {
      const response = await api.post("/leads", data);
      set((state) => ({
        leads: [...state.leads, response.data],
      }));
    } catch (error) {
      console.error("Failed to create lead:", error);
      throw error;
    }
  },

  updateLead: async (id, data) => {
    try {
      const response = await api.patch(`/leads/${id}`, data);
      set((state) => ({
        leads: state.leads.map((lead) =>
          lead._id === id ? response.data : lead
        ),
      }));
    } catch (error) {
      console.error("Failed to update lead:", error);
      throw error;
    }
  },

  deleteLead: async (id) => {
    try {
      await api.delete(`/leads/${id}`);
      set((state) => ({
        leads: state.leads.filter((lead) => lead._id !== id),
      }));
    } catch (error) {
      console.error("Failed to delete lead:", error);
      throw error;
    }
  },

  assignLeadToAgent: async (leadId, agentId) => {
    try {
      const response = await api.post(`/leads/${leadId}/assign`, { agentId });
      set((state) => ({
        leads: state.leads.map((lead) =>
          lead._id === leadId ? response.data : lead
        ),
      }));
    } catch (error) {
      console.error("Failed to assign lead:", error);
      throw error;
    }
  },
}));
