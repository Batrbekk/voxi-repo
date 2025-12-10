// User types
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  COMPANY_ADMIN = 'company_admin',
  MANAGER = 'manager',
}

export interface User {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  companyId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Agent types
export enum AgentLanguage {
  RU_RU = 'ru-RU',
  EN_US = 'en-US',
  KK_KZ = 'kk-KZ',
}

export enum AgentGender {
  MALE = 'male',
  FEMALE = 'female',
  NEUTRAL = 'neutral',
}

export interface VoiceSettings {
  voiceName: string;
  language: AgentLanguage;
  gender: AgentGender;
  speakingRate: number;
  pitch: number;
  volumeGainDb: number;
}

export interface AISettings {
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  integratedWithAi: boolean;
}

export interface WorkingHours {
  enabled: boolean;
  timezone: string;
  start: string;
  end: string;
  workDays: number[];
}

export interface Agent {
  _id: string;
  companyId: string;
  name: string;
  description?: string;
  voiceSettings: VoiceSettings;
  aiSettings: AISettings;
  workingHours?: WorkingHours;
  knowledgeBaseId?: string;
  inboundGreetingMessage?: string;
  outboundGreetingMessage?: string;
  fallbackMessage?: string;
  endingMessage?: string;
  phoneNumbers: string[];
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageDuration: number;
  conversionRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Lead types
export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost',
}

export enum LeadSource {
  WEBSITE = 'website',
  REFERRAL = 'referral',
  COLD_CALL = 'cold_call',
  EMAIL = 'email',
  SOCIAL = 'social',
  EVENT = 'event',
  OTHER = 'other',
}

export interface Lead {
  _id: string;
  companyId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  status: LeadStatus;
  source: LeadSource;
  assignedTo?: string;
  tags: string[];
  notes: string[];
  customFields: Record<string, any>;
  lastContactedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Conversation types
export enum CallStatus {
  RINGING = 'ringing',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  MISSED = 'missed',
  NO_ANSWER = 'no_answer',
  BUSY = 'busy',
}

export enum CallerType {
  AI_AGENT = 'ai_agent',
  HUMAN_MANAGER = 'human_manager',
}

export enum CallDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export interface Conversation {
  _id: string;
  companyId: string;
  callId: string;
  sipCallId?: string;
  phoneNumber: string;
  direction: CallDirection;
  callerType: CallerType;
  status: CallStatus;
  agentId?: string;
  managerId?: string;
  leadId?: string;
  startedAt: string;
  answeredAt?: string;
  endedAt?: string;
  duration: number;
  ringDuration: number;
  transcript?: string;
  audioUrl?: string;
  notes: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// Knowledge Base types
export enum DocumentType {
  TEXT = 'text',
  PDF = 'pdf',
  DOCX = 'docx',
  XLSX = 'xlsx',
  URL = 'url',
}

export enum DocumentStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface KnowledgeBaseItem {
  type: DocumentType;
  title: string;
  content?: string;
  fileUrl?: string;
  status: DocumentStatus;
  metadata: {
    fileSize?: number;
    mimeType?: string;
    pageCount?: number;
    wordCount?: number;
    uploadedAt?: string;
    processedAt?: string;
    error?: string;
  };
}

export interface KnowledgeBase {
  _id: string;
  companyId: string;
  name: string;
  description?: string;
  documents: KnowledgeBaseItem[];
  createdAt: string;
  updatedAt: string;
}

// Manager types
export interface ManagerPermissions {
  canViewAllLeads: boolean;
  canTakeLeads: boolean;
  canEditLeads: boolean;
  canMakeCallsAsAgent: boolean;
  canViewAnalytics: boolean;
  canManageOwnLeads: boolean;
}

export interface Manager {
  _id: string;
  userId: {
    _id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    isActive: boolean;
  };
  companyId: string;
  permissions: ManagerPermissions;
  assignedLeadsCount: number;
  completedCallsCount: number;
  successfulConversionsCount: number;
  isActive: boolean;
  invitedAt: string;
  firstLoginAt?: string;
  lastActivityAt?: string;
  hasChangedPassword: boolean;
  createdAt: string;
  updatedAt: string;
}

// Phone Number types
export interface SipConfig {
  server: string;
  port: number;
  protocol: 'UDP' | 'TCP';
  codec: string;
  maxSessions: number;
}

export interface PhoneNumber {
  _id: string;
  companyId: string;
  phoneNumber: string;
  label: string;
  provider: string;
  assignedAgentId?: string;
  isActive: boolean;
  sipConfig: SipConfig;
  lastUsedAt?: string;
  totalCallsCount: number;
  activeCallsCount: number;
  createdAt: string;
  updatedAt: string;
}

// Batch Call types
export enum BatchCallStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum RecipientCallStatus {
  PENDING = 'pending',
  CALLING = 'calling',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface BatchCallRecipient {
  phoneNumber: string;
  leadId?: string;
  status: RecipientCallStatus;
  conversationId?: string;
  scheduledAt?: string;
  calledAt?: string;
  customVariables: Record<string, any>;
}

export interface BatchCall {
  _id: string;
  companyId: string;
  name: string;
  agentId: string;
  phoneNumberId: string;
  scheduledTime?: string;
  status: BatchCallStatus;
  totalRecipientsCount: number;
  completedCallsCount: number;
  failedCallsCount: number;
  cancelledCallsCount: number;
  recipients: BatchCallRecipient[];
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
