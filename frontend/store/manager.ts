import { create } from 'zustand';
import api from '@/lib/api';
import { Manager, ManagerPermissions } from '@/types';

interface InviteManagerData {
  email: string;
  firstName: string;
  lastName: string;
  permissions?: Partial<ManagerPermissions>;
}

interface UpdateManagerData {
  permissions?: Partial<ManagerPermissions>;
  isActive?: boolean;
}

interface ManagerState {
  managers: Manager[];
  currentManager: Manager | null;
  isLoading: boolean;
  fetchManagers: () => Promise<void>;
  fetchManager: (id: string) => Promise<void>;
  inviteManager: (data: InviteManagerData) => Promise<Manager>;
  updateManager: (id: string, data: UpdateManagerData) => Promise<Manager>;
  deleteManager: (id: string) => Promise<void>;
  deactivateManager: (id: string) => Promise<void>;
}

export const useManagerStore = create<ManagerState>((set, get) => ({
  managers: [],
  currentManager: null,
  isLoading: false,

  fetchManagers: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/managers');
      set({ managers: response.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchManager: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/managers/${id}`);
      set({ currentManager: response.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  inviteManager: async (data: InviteManagerData) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/managers/invite', data);
      const newManager = response.data;
      set((state) => ({
        managers: [...state.managers, newManager],
        isLoading: false,
      }));
      return newManager;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateManager: async (id: string, data: UpdateManagerData) => {
    set({ isLoading: true });
    try {
      const response = await api.patch(`/managers/${id}`, data);
      const updatedManager = response.data;
      set((state) => ({
        managers: state.managers.map((m) => (m._id === id ? updatedManager : m)),
        currentManager: state.currentManager?._id === id ? updatedManager : state.currentManager,
        isLoading: false,
      }));
      return updatedManager;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  deleteManager: async (id: string) => {
    set({ isLoading: true });
    try {
      await api.delete(`/managers/${id}`);
      set((state) => ({
        managers: state.managers.filter((m) => m._id !== id),
        currentManager: state.currentManager?._id === id ? null : state.currentManager,
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  deactivateManager: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await api.patch(`/managers/${id}/deactivate`);
      const updatedManager = response.data;
      set((state) => ({
        managers: state.managers.map((m) => (m._id === id ? updatedManager : m)),
        currentManager: state.currentManager?._id === id ? updatedManager : state.currentManager,
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
}));
