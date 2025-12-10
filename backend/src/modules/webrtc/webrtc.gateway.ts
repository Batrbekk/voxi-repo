import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SipService } from '../sip/sip.service';
import { ConversationService } from '../conversation/conversation.service';
import { GoogleCloudService } from '../google-cloud/google-cloud.service';
import { AIConversationService } from '../ai-conversation/ai-conversation.service';
import { MediaService } from '../media/media.service';
import { SipGeminiBridge } from '../gemini-live/sip-gemini-bridge.service';
import { AriService } from '../ari/ari.service';
import { AriGeminiBridge } from '../ari/ari-gemini-bridge.service';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CallDirection, CallerType, CallStatus } from '../../schemas/conversation.schema';
import { Agent } from '../../schemas/agent.schema';
import { KnowledgeBase } from '../../schemas/knowledge-base.schema';

interface CallData {
  phoneNumber: string;
  managerId: string;
  leadId?: string;
}

interface ManagerSession {
  socket: Socket;
  managerId: string;
  managerName: string;
  currentCallId?: string;
  isRecording: boolean;
  audioChunks: Buffer[];
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'],
    credentials: true,
  },
  namespace: '/webrtc',
})
export class WebRtcGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebRtcGateway.name);
  private managerSessions: Map<string, ManagerSession> = new Map();
  private activeBridges: Map<string, any> = new Map(); // Can hold both SipGeminiBridge and AriGeminiBridge
  private activeAriBridges: Map<string, AriGeminiBridge> = new Map();

  constructor(
    private sipService: SipService,
    private ariService: AriService,
    private conversationService: ConversationService,
    private googleCloudService: GoogleCloudService,
    private aiConversationService: AIConversationService,
    private mediaService: MediaService,
    private configService: ConfigService,
    @InjectModel('Agent') private agentModel: Model<Agent>,
    @InjectModel('KnowledgeBase') private knowledgeBaseModel: Model<KnowledgeBase>,
  ) {
    // Listen to SIP service events (legacy/Drachtio)
    this.sipService.on('call:incoming', (data) => {
      this.handleIncomingCall(data);
    });

    this.sipService.on('call:answered', (session) => {
      this.notifyCallStatus(session.callId, 'answered');
    });

    this.sipService.on('call:connected', (session) => {
      this.handleIncomingCall({ session });
    });

    this.sipService.on('call:ended', (session) => {
      this.handleCallEnded(session);
    });

    this.sipService.on('call:failed', (session) => {
      this.notifyCallStatus(session.callId, 'failed');
    });

    // Listen to ARI events (Asterisk)
    this.ariService.on('channel:start', (data) => {
      this.handleAriChannelStart(data);
    });

    this.ariService.on('channel:end', (data) => {
      this.handleAriChannelEnd(data);
    });

    // Listen to AI conversation service events
    this.aiConversationService.on('play-audio', (data) => {
      this.handleAIAudioPlayback(data);
    });
  }

  afterInit(server: Server) {
    this.logger.log('WebRTC Gateway initialized');
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    // Extract user info from JWT token (passed in handshake auth)
    const token = client.handshake.auth.token;
    if (!token) {
      client.disconnect();
      return;
    }

    // TODO: Verify JWT token and extract user info
    // For now, accepting connection
    client.emit('connected', {
      message: 'Connected to WebRTC Gateway',
    });
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Find and cleanup manager session
    for (const [managerId, session] of this.managerSessions.entries()) {
      if (session.socket.id === client.id) {
        // Hangup active call if any
        if (session.currentCallId) {
          await this.sipService.hangupCall(session.currentCallId);
        }

        this.managerSessions.delete(managerId);
        break;
      }
    }
  }

  /**
   * Manager registers their session
   */
  @SubscribeMessage('register')
  async handleRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { managerId: string; managerName: string },
  ) {
    this.logger.log(`Manager registered: ${data.managerId}`);

    const session: ManagerSession = {
      socket: client,
      managerId: data.managerId,
      managerName: data.managerName,
      isRecording: false,
      audioChunks: [],
    };

    this.managerSessions.set(data.managerId, session);

    client.emit('registered', {
      success: true,
      message: 'Manager session registered',
    });
  }

  /**
   * Manager initiates outbound call
   */
  @SubscribeMessage('call:start')
  async handleStartCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CallData,
  ) {
    const session = this.findSessionBySocket(client);

    if (!session) {
      client.emit('error', { message: 'Session not registered' });
      return;
    }

    try {
      this.logger.log(`Starting call to ${data.phoneNumber} by manager ${session.managerId}`);

      // Create SIP call
      const sipSession = await this.sipService.makeCall(data.phoneNumber);

      // Create conversation record
      const conversation = await this.conversationService.createConversation(
        session.managerId as any, // companyId will be extracted from JWT
        {
          callId: sipSession.callId,
          phoneNumber: data.phoneNumber,
          direction: CallDirection.OUTBOUND,
          callerType: CallerType.HUMAN_MANAGER,
          managerId: session.managerId,
          managerName: session.managerName,
          startedAt: sipSession.startedAt.toISOString(),
          leadId: data.leadId,
        },
      );

      session.currentCallId = sipSession.callId;
      session.isRecording = true;
      session.audioChunks = [];

      client.emit('call:started', {
        callId: sipSession.callId,
        conversationId: conversation._id,
      });

    } catch (error) {
      this.logger.error('Failed to start call:', error);
      client.emit('call:failed', {
        error: error.message,
      });
    }
  }

  /**
   * Manager ends call
   */
  @SubscribeMessage('call:end')
  async handleEndCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string },
  ) {
    const session = this.findSessionBySocket(client);

    if (!session) {
      return;
    }

    try {
      await this.sipService.hangupCall(data.callId);

      session.currentCallId = undefined;
      session.isRecording = false;

      client.emit('call:ended', {
        callId: data.callId,
      });

    } catch (error) {
      this.logger.error('Failed to end call:', error);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Receive audio stream from manager (for recording)
   */
  @SubscribeMessage('audio:stream')
  async handleAudioStream(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string; audio: ArrayBuffer },
  ) {
    const session = this.findSessionBySocket(client);

    if (!session || !session.isRecording) {
      return;
    }

    // Store audio chunk
    const audioBuffer = Buffer.from(data.audio);
    session.audioChunks.push(audioBuffer);
  }

  /**
   * Send DTMF tones
   */
  @SubscribeMessage('call:dtmf')
  async handleDTMF(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string; digits: string },
  ) {
    try {
      await this.sipService.sendDTMF(data.callId, data.digits);

      client.emit('dtmf:sent', {
        callId: data.callId,
        digits: data.digits,
      });

    } catch (error) {
      this.logger.error('Failed to send DTMF:', error);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Handle incoming call notification
   */
  private async handleIncomingCall(data: { session: any; req?: any; res?: any }) {
    const { session: sipSession, req, res } = data;

    this.logger.log(`Incoming call: ${sipSession.callId} from ${sipSession.phoneNumber}`);

    try {
      // Determine the phone number to check for agent assignment
      // For inbound calls: check 'to' (the number being called)
      // For outbound calls: check 'from' (our number making the call)
      const phoneToCheck = sipSession.direction === 'inbound'
        ? sipSession.to
        : sipSession.from;

      // Find agent assigned to this phone number
      this.logger.log(`Looking for agent with phone number: ${phoneToCheck}`);
      const agent = await this.agentModel.findOne({
        phoneNumbers: phoneToCheck,
        isActive: true,
      }).lean();

      if (agent && req && res) {
        this.logger.log(`Agent ${agent.name} found for phone number ${phoneToCheck}`);

        // Always use Gemini Live for natural conversations
        await this.handleGeminiLiveCall(sipSession, req, res, agent);
      } else {
        // Also try without isActive filter to debug
        const anyAgent = await this.agentModel.findOne({
          phoneNumbers: phoneToCheck,
        }).lean();

        if (anyAgent) {
          this.logger.log(`Found agent ${anyAgent.name} but isActive=${anyAgent.isActive} for phone number ${phoneToCheck}`);
        } else {
          this.logger.log(`No agent found at all for phone number ${phoneToCheck}`);
        }
        this.logger.log(`No active agent found for phone number ${phoneToCheck}, notifying managers`);

        // No agent assigned - notify managers for manual handling
        this.server.emit('call:incoming', {
          callId: sipSession.callId,
          phoneNumber: sipSession.phoneNumber,
          startedAt: sipSession.startedAt,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to handle incoming call ${sipSession.callId}:`, error);

      // Fallback: notify managers
      this.server.emit('call:incoming', {
        callId: sipSession.callId,
        phoneNumber: sipSession.phoneNumber,
        startedAt: sipSession.startedAt,
      });
    }
  }

  /**
   * Handle call ended - save recording and transcript
   */
  private async handleCallEnded(sipSession: any) {
    this.logger.log(`Call ended: ${sipSession.callId}`);

    // Check if there's an active Gemini Live bridge and end it
    const bridge = this.activeBridges.get(sipSession.callId);
    if (bridge) {
      try {
        await bridge.stop();
        this.activeBridges.delete(sipSession.callId);
        this.logger.log(`Gemini Live bridge stopped for call ${sipSession.callId}`);
        // Bridge will emit 'bridgeEnded' event which handles conversation saving
        return; // Exit early as bridge handles saving
      } catch (error) {
        this.logger.error(`Failed to stop Gemini Live bridge for call ${sipSession.callId}:`, error);
      }
    }

    // Check if there's an active AI session and end it
    if (this.aiConversationService.isSessionActive(sipSession.callId)) {
      try {
        await this.aiConversationService.endSession(sipSession.callId);
        this.logger.log(`AI conversation session ended for call ${sipSession.callId}`);
      } catch (error) {
        this.logger.error(`Failed to end AI session for call ${sipSession.callId}:`, error);
      }
    }

    // Find manager session
    for (const session of this.managerSessions.values()) {
      if (session.currentCallId === sipSession.callId) {
        try {
          // Combine audio chunks
          const fullAudio = Buffer.concat(session.audioChunks);

          // Upload to Google Cloud Storage
          const audioUrl = await this.googleCloudService.uploadAudioFile(
            fullAudio,
            `${sipSession.callId}.webm`,
            'audio/webm',
          );

          // Transcribe audio
          const transcript = await this.googleCloudService.transcribeAudioBuffer(
            fullAudio,
            'ru-RU',
          );

          // Analyze conversation
          const analysis = await this.googleCloudService.analyzeConversation(transcript);

          // Update conversation record
          await this.conversationService.updateConversation(
            sipSession.callId as any,
            session.managerId as any,
            {
              status: CallStatus.COMPLETED,
              endedAt: sipSession.endedAt?.toISOString(),
              duration: sipSession.duration,
              audioUrl,
              transcript,
              aiAnalysis: analysis,
            },
          );

          // Notify manager
          session.socket.emit('call:processed', {
            callId: sipSession.callId,
            audioUrl,
            transcript,
            analysis,
          });

          // Cleanup
          session.currentCallId = undefined;
          session.isRecording = false;
          session.audioChunks = [];

        } catch (error) {
          this.logger.error('Failed to process call recording:', error);
        }

        break;
      }
    }
  }

  /**
   * Handle incoming call with Gemini Live API for natural conversations
   */
  private async handleGeminiLiveCall(
    sipSession: any,
    req: any,
    res: any,
    agent: any,
  ): Promise<void> {
    try {
      this.logger.log(`Starting Gemini Live session for call ${sipSession.callId}`);

      // Get knowledge base if configured
      let knowledgeBase: any = null;
      if (agent.knowledgeBaseId) {
        knowledgeBase = await this.knowledgeBaseModel.findById(agent.knowledgeBaseId).lean();
      }

      // Connect call to Freeswitch to get media endpoint
      const mediaEndpoint = await this.mediaService.connectCaller(
        sipSession.callId,
        req,
        res,
      );

      this.logger.log(`Call ${sipSession.callId} connected to Freeswitch for Gemini Live`);

      // Create a new bridge instance for this call
      const bridge = new SipGeminiBridge(this.configService);

      // Build comprehensive system prompt
      let systemPrompt = `You are ${agent.name}, a professional voice agent.\n\n`;
      systemPrompt += agent.aiSettings?.systemPrompt || 'You are a helpful assistant.';
      systemPrompt += `\n\nYour name is: ${agent.name}`;
      systemPrompt += `\nYour role: Sales representative`;
      systemPrompt += `\nCompany: ${(agent as any).companyName || 'Our company'}`;

      // Prepare configuration for Gemini Live
      const config = {
        sipCallId: sipSession.callId,
        phoneNumber: sipSession.phoneNumber,
        direction: sipSession.direction,
        agentId: agent._id.toString(),
        agentName: agent.name,
        companyName: (agent as any).companyName,
        systemPrompt: systemPrompt,
        voiceSettings: agent.voiceSettings || {
          voiceName: 'Aoede', // Default Russian-friendly voice
          language: 'ru',
          speakingRate: 1.0,
          pitch: 0,
        },
        greetingMessages: {
          inbound: agent.inboundGreetingMessage,
          outbound: agent.outboundGreetingMessage,
          fallback: agent.fallbackMessage,
          ending: agent.endingMessage,
        },
        knowledgeBase: knowledgeBase ? {
          name: knowledgeBase.name,
          description: knowledgeBase.description,
          documents: knowledgeBase.documents,
        } : null,
        temperature: agent.aiSettings?.temperature || 0.7,
      };

      // Set up bridge event handlers
      bridge.on('transcript', (data) => {
        this.logger.debug(`Transcript: ${data.text}`);
      });

      bridge.on('bridgeEnded', async (data) => {
        this.logger.log(`Gemini Live bridge ended for call ${sipSession.callId}`);

        try {
          // Process the conversation data
          const transcript = data.transcriptSegments
            .map((seg: any) => `${seg.role === 'user' ? 'Пользователь' : 'Ассистент'}: ${seg.text}`)
            .join('\n\n');

          // Upload audio recording to Google Cloud Storage
          let audioUrl: string | null = null;
          if (data.recordingBuffer && data.recordingBuffer.length > 0) {
            audioUrl = await this.googleCloudService.uploadAudioFile(
              data.recordingBuffer,
              `${sipSession.callId}.pcm`,
              'audio/pcm',
            );
          }

          // Analyze conversation
          const analysis = await this.googleCloudService.analyzeConversation(transcript);

          // Create conversation record (first create with basic info)
          const conversation = await this.conversationService.createConversation(
            agent.companyId,
            {
              callId: sipSession.callId,
              phoneNumber: sipSession.phoneNumber,
              direction: sipSession.direction === 'inbound' ? CallDirection.INBOUND : CallDirection.OUTBOUND,
              callerType: CallerType.AI_AGENT,
              agentId: agent._id.toString(),
              startedAt: sipSession.startedAt?.toISOString() || new Date().toISOString(),
            },
          );

          // Then update with complete data
          await this.conversationService.updateConversation(
            conversation._id as any,
            agent._id.toString() as any,
            {
              status: CallStatus.COMPLETED,
              endedAt: new Date().toISOString(),
              duration: data.duration,
              audioUrl: audioUrl || undefined,
              transcript,
              aiAnalysis: analysis,
              metadata: {
                isGeminiLive: true,
                transcriptSegments: data.transcriptSegments.length,
              },
            },
          );

          this.logger.log(`Conversation saved for Gemini Live call ${sipSession.callId}`);
        } catch (error) {
          this.logger.error(`Failed to save Gemini Live conversation:`, error);
        }

        // Remove from active bridges
        this.activeBridges.delete(sipSession.callId);
      });

      bridge.on('error', (error) => {
        this.logger.error(`Gemini Live bridge error for call ${sipSession.callId}:`, error);
        this.activeBridges.delete(sipSession.callId);
      });

      // Start the bridge
      await bridge.start(mediaEndpoint.endpoint, config);

      // Store the bridge for later cleanup
      this.activeBridges.set(sipSession.callId, bridge);

      this.logger.log(`Gemini Live session active for call ${sipSession.callId}`);

    } catch (error) {
      this.logger.error(`Failed to start Gemini Live session for call ${sipSession.callId}:`, error);

      // Fall back to traditional AI conversation if Gemini Live fails
      this.logger.log(`Falling back to traditional AI conversation for call ${sipSession.callId}`);

      // Start traditional AI conversation session as fallback
      await this.aiConversationService.startSession(
        sipSession.callId,
        agent._id.toString(),
        sipSession.direction === 'inbound' ? 'inbound' : 'outbound',
      );
    }
  }

  /**
   * Handle AI audio playback (TTS)
   */
  private handleAIAudioPlayback(data: { callId: string; audioContent: Buffer; message: string }) {
    this.logger.log(`AI audio playback for call ${data.callId}: "${data.message}"`);

    // TODO: Implement actual audio playback through SIP dialog
    // This requires media server (Freeswitch/Asterisk) integration
    // The audioContent is a Buffer containing the MP3/WAV audio from Google TTS

    // For now, just log that we have the audio ready
    this.logger.debug(`Audio buffer size: ${data.audioContent.length} bytes`);

    // Future implementation:
    // 1. Convert audio format if needed (MP3 -> ulaw/alaw for SIP)
    // 2. Stream audio to the SIP dialog via drachtio-fsmrf
    // 3. Wait for audio playback to complete
    // 4. Listen for user speech input
  }

  /**
   * Notify call status to relevant manager
   */
  private notifyCallStatus(callId: string, status: string) {
    for (const session of this.managerSessions.values()) {
      if (session.currentCallId === callId) {
        session.socket.emit('call:status', {
          callId,
          status,
        });
        break;
      }
    }
  }

  /**
   * Find session by socket
   */
  private findSessionBySocket(socket: Socket): ManagerSession | undefined {
    for (const session of this.managerSessions.values()) {
      if (session.socket.id === socket.id) {
        return session;
      }
    }
    return undefined;
  }

  /**
   * Get active manager sessions count
   */
  getActiveSessions(): number {
    return this.managerSessions.size;
  }

  /**
   * Get active calls count
   */
  getActiveCalls(): number {
    let count = 0;
    for (const session of this.managerSessions.values()) {
      if (session.currentCallId) {
        count++;
      }
    }
    return count;
  }

  /**
   * Handle ARI channel start (incoming call from Asterisk)
   */
  private async handleAriChannelStart(data: { channel: any; ariChannel: any; args: string[] }): Promise<void> {
    const { channel, ariChannel } = data;

    this.logger.log(`ARI channel started: ${channel.id}`);
    this.logger.log(`Caller: ${channel.caller.number} -> ${channel.connected.number}`);

    try {
      // Find agent assigned to this phone number
      const phoneToCheck = channel.connected.number;

      const agent = await this.agentModel.findOne({
        phoneNumbers: phoneToCheck,
        isActive: true,
      }).lean();

      if (agent) {
        this.logger.log(`Agent ${agent.name} found for phone number ${phoneToCheck}`);

        // Use Gemini Live with ARI for natural conversations
        await this.handleAriGeminiLiveCall(channel, ariChannel, agent);
      } else {
        this.logger.log(`No agent found for phone number ${phoneToCheck}, notifying managers`);

        // No agent assigned - notify managers for manual handling
        this.server.emit('call:incoming', {
          callId: channel.id,
          phoneNumber: channel.caller.number,
          startedAt: channel.creationtime,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to handle ARI channel start ${channel.id}:`, error);

      // Hangup the channel on error
      try {
        await this.ariService.hangupChannel(channel.id);
      } catch (hangupError) {
        this.logger.error(`Failed to hangup channel ${channel.id}:`, hangupError);
      }
    }
  }

  /**
   * Handle ARI channel end
   */
  private async handleAriChannelEnd(data: { channel: any; ariChannel: any }): Promise<void> {
    const { channel } = data;

    this.logger.log(`ARI channel ended: ${channel.id}`);

    // Check if there's an active ARI-Gemini bridge
    const bridge = this.activeAriBridges.get(channel.id);
    if (bridge) {
      try {
        await bridge.stop();
        this.activeAriBridges.delete(channel.id);
        this.logger.log(`ARI-Gemini bridge stopped for channel ${channel.id}`);
      } catch (error) {
        this.logger.error(`Failed to stop ARI-Gemini bridge for channel ${channel.id}:`, error);
      }
    }
  }

  /**
   * Handle incoming call with Gemini Live API using ARI
   */
  private async handleAriGeminiLiveCall(
    channel: any,
    ariChannel: any,
    agent: any,
  ): Promise<void> {
    try {
      this.logger.log(`Starting Gemini Live session for ARI channel ${channel.id}`);

      // Get knowledge base if configured
      let knowledgeBase: any = null;
      if (agent.knowledgeBaseId) {
        knowledgeBase = await this.knowledgeBaseModel.findById(agent.knowledgeBaseId).lean();
      }

      // Create a new ARI-Gemini bridge instance
      const bridge = new AriGeminiBridge(this.configService, this.ariService);

      // Build comprehensive system prompt
      let systemPrompt = `You are ${agent.name}, a professional voice agent.\n\n`;
      systemPrompt += agent.aiSettings?.systemPrompt || 'You are a helpful assistant.';
      systemPrompt += `\n\nYour name is: ${agent.name}`;
      systemPrompt += `\nYour role: Sales representative`;
      systemPrompt += `\nCompany: ${(agent as any).companyName || 'Our company'}`;

      // Prepare configuration for Gemini Live
      const config = {
        channelId: channel.id,
        callerNumber: channel.caller.number,
        calledNumber: channel.connected.number,
        direction: 'inbound' as const,
        agentId: agent._id.toString(),
        agentName: agent.name,
        companyName: (agent as any).companyName,
        systemPrompt: systemPrompt,
        voiceSettings: agent.voiceSettings || {
          voiceName: 'Aoede',
          language: 'ru',
          speakingRate: 1.0,
          pitch: 0,
        },
        greetingMessages: {
          inbound: agent.inboundGreetingMessage,
          outbound: agent.outboundGreetingMessage,
          fallback: agent.fallbackMessage,
          ending: agent.endingMessage,
        },
        knowledgeBase: knowledgeBase ? {
          name: knowledgeBase.name,
          description: knowledgeBase.description,
          documents: knowledgeBase.documents,
        } : null,
        temperature: agent.aiSettings?.temperature || 0.7,
      };

      // Set up bridge event handlers
      bridge.on('transcript', (data) => {
        this.logger.debug(`Transcript: ${data.text}`);
      });

      bridge.on('bridgeEnded', async (data) => {
        this.logger.log(`ARI-Gemini bridge ended for channel ${channel.id}`);

        try {
          // Process the conversation data
          const transcript = data.transcriptSegments
            .map((seg: any) => `${seg.role === 'user' ? 'Пользователь' : 'Ассистент'}: ${seg.text}`)
            .join('\n\n');

          // Upload audio recording to Google Cloud Storage
          let audioUrl: string | null = null;
          if (data.recordingBuffer && data.recordingBuffer.length > 0) {
            audioUrl = await this.googleCloudService.uploadAudioFile(
              data.recordingBuffer,
              `${channel.id}.pcm`,
              'audio/pcm',
            );
          }

          // Analyze conversation
          const analysis = await this.googleCloudService.analyzeConversation(transcript);

          // Create conversation record
          const conversation = await this.conversationService.createConversation(
            agent.companyId,
            {
              callId: channel.id,
              phoneNumber: channel.caller.number,
              direction: CallDirection.INBOUND,
              callerType: CallerType.AI_AGENT,
              agentId: agent._id.toString(),
              startedAt: channel.creationtime,
            },
          );

          // Update with complete data
          await this.conversationService.updateConversation(
            conversation._id as any,
            agent._id.toString() as any,
            {
              status: CallStatus.COMPLETED,
              endedAt: new Date().toISOString(),
              duration: data.duration,
              audioUrl: audioUrl || undefined,
              transcript,
              aiAnalysis: analysis,
              metadata: {
                isGeminiLive: true,
                isAsteriskAri: true,
                transcriptSegments: data.transcriptSegments.length,
              },
            },
          );

          this.logger.log(`Conversation saved for ARI-Gemini call ${channel.id}`);
        } catch (error) {
          this.logger.error(`Failed to save ARI-Gemini conversation:`, error);
        }

        // Remove from active bridges
        this.activeAriBridges.delete(channel.id);
      });

      bridge.on('error', (error) => {
        this.logger.error(`ARI-Gemini bridge error for channel ${channel.id}:`, error);
        this.activeAriBridges.delete(channel.id);
      });

      // Start the bridge
      await bridge.start(channel.id, config);

      // Store the bridge for later cleanup
      this.activeAriBridges.set(channel.id, bridge);

      this.logger.log(`ARI-Gemini Live session active for channel ${channel.id}`);

    } catch (error) {
      this.logger.error(`Failed to start ARI-Gemini Live session for channel ${channel.id}:`, error);

      // Hangup the channel on error
      try {
        await this.ariService.hangupChannel(channel.id);
      } catch (hangupError) {
        this.logger.error(`Failed to hangup channel ${channel.id}:`, hangupError);
      }
    }
  }
}
