import { create } from 'zustand';
import api from '@/lib/api';
import { Agent } from '@/types';

interface AgentState {
  agents: Agent[];
  currentAgent: Agent | null;
  isLoading: boolean;
  fetchAgents: () => Promise<void>;
  fetchAgent: (id: string) => Promise<void>;
  createAgent: (data: Partial<Agent>) => Promise<Agent>;
  updateAgent: (id: string, data: Partial<Agent>) => Promise<Agent>;
  deleteAgent: (id: string) => Promise<void>;
  toggleAgentStatus: (id: string, isActive: boolean) => Promise<void>;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  currentAgent: null,
  isLoading: false,

  fetchAgents: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/agents');
      set({ agents: Array.isArray(response.data) ? response.data : [], isLoading: false });
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      set({ agents: [], isLoading: false }); // Ensure agents is always an array even on error
    }
  },

  fetchAgent: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/agents/${id}`);
      set({ currentAgent: response.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createAgent: async (data: Partial<Agent>) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/agents', data);
      const newAgent = response.data;
      set((state) => ({
        agents: [...state.agents, newAgent],
        isLoading: false,
      }));
      return newAgent;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateAgent: async (id: string, data: Partial<Agent>) => {
    set({ isLoading: true });
    try {
      const response = await api.patch(`/agents/${id}`, data);
      const updatedAgent = response.data;
      set((state) => ({
        agents: state.agents.map((a) => (a._id === id ? updatedAgent : a)),
        currentAgent: state.currentAgent?._id === id ? updatedAgent : state.currentAgent,
        isLoading: false,
      }));
      return updatedAgent;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  deleteAgent: async (id: string) => {
    set({ isLoading: true });
    try {
      await api.delete(`/agents/${id}`);
      set((state) => ({
        agents: state.agents.filter((a) => a._id !== id),
        currentAgent: state.currentAgent?._id === id ? null : state.currentAgent,
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  toggleAgentStatus: async (id: string, isActive: boolean) => {
    try {
      const endpoint = isActive ? `/agents/${id}/activate` : `/agents/${id}/deactivate`;
      const response = await api.patch(endpoint);
      const updatedAgent = response.data;
      set((state) => ({
        agents: state.agents.map((a) => (a._id === id ? updatedAgent : a)),
        currentAgent: state.currentAgent?._id === id ? updatedAgent : state.currentAgent,
      }));
    } catch (error) {
      throw error;
    }
  },
}));
