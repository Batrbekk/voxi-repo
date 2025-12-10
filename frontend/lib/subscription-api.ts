import api from './api';

export interface Plan {
  _id: string;
  type: 'starter' | 'business' | 'enterprise';
  name: string;
  nameRu: string;
  priceKzt: number;
  priceUsd: number;
  minutesIncluded: number;
  maxAgents: number;
  maxManagers: number;
  pricePerExtraMinute: number;
  features: string[];
  isActive: boolean;
}

export interface UsageStats {
  minutesUsed: number;
  agentsCreated: number;
  managersCreated: number;
}

export interface Subscription {
  _id: string;
  companyId: string;
  planType: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'trial' | 'expired' | 'cancelled';
  currentPeriodUsage: UsageStats;
  isAutoRenew: boolean;
  createdAt: string;
  updatedAt: string;
  plan?: Plan;
}

export interface SubscriptionLimits {
  canCreateAgent: boolean;
  canCreateManager: boolean;
  canMakeCall: boolean;
  remainingMinutes: number;
}

export const subscriptionApi = {
  /**
   * Get all available plans
   */
  async getPlans(): Promise<Plan[]> {
    const response = await api.get('/subscription/plans');
    return response.data;
  },

  /**
   * Get current company subscription
   */
  async getCurrentSubscription(): Promise<Subscription | null> {
    try {
      const response = await api.get('/subscription/current');
      return response.data;
    } catch (error) {
      console.warn('Subscription endpoint not available:', error);
      return null;
    }
  },

  /**
   * Create new subscription
   */
  async createSubscription(planType: string): Promise<Subscription> {
    const response = await api.post('/subscription', { planType });
    return response.data;
  },

  /**
   * Update subscription plan
   */
  async updateSubscription(planType: string): Promise<Subscription> {
    const response = await api.put('/subscription', { planType });
    return response.data;
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(): Promise<{ message: string }> {
    const response = await api.delete('/subscription');
    return response.data;
  },

  /**
   * Renew subscription
   */
  async renewSubscription(): Promise<Subscription> {
    const response = await api.post('/subscription/renew');
    return response.data;
  },

  /**
   * Check usage limits
   */
  async checkLimits(): Promise<SubscriptionLimits> {
    const response = await api.get('/subscription/limits');
    return response.data;
  },
};
