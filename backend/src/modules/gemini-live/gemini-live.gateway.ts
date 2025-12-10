import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiLiveService, GeminiLiveConfig } from './gemini-live.service';
import { AgentService } from '../agent/agent.service';
import { Types } from 'mongoose';

interface AgentTestSession {
  agentId: string;
  geminiService: GeminiLiveService;
  socket: Socket;
}

@WebSocketGateway({
  namespace: '/agent-test',
  cors: {
    origin: '*',
  },
})
export class GeminiLiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GeminiLiveGateway.name);
  private sessions = new Map<string, AgentTestSession>();

  constructor(
    private readonly agentService: AgentService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Clean up session
    const session = this.sessions.get(client.id);
    if (session) {
      session.geminiService.disconnect();
      this.sessions.delete(client.id);
    }
  }

  @SubscribeMessage('agent:start')
  async handleStartAgent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { agentId: string },
  ) {
    try {
      this.logger.log(`Starting agent test for agent: ${data.agentId}`);

      // Get agent configuration
      const agentObjectId = new Types.ObjectId(data.agentId);
      const agent = await this.agentService['agentModel'].findById(agentObjectId);

      if (!agent) {
        client.emit('error', { message: 'Agent not found' });
        return;
      }

      // Create Gemini Live service instance
      const geminiService = new GeminiLiveService(this.configService);

      // Set up event listeners BEFORE connecting (to catch early events)
      geminiService.on('audio', (audioData) => {
        this.logger.log(`Forwarding audio to client: ${audioData.data.length} bytes`);
        client.emit('agent:audio', {
          audio: audioData.data.toString('base64'),
          mimeType: audioData.mimeType,
          timestamp: audioData.timestamp,
        });
      });

      geminiService.on('transcript', (transcript) => {
        client.emit('agent:transcript', transcript);
      });

      geminiService.on('turnComplete', (data) => {
        client.emit('agent:turnComplete', data);
      });

      geminiService.on('interrupted', () => {
        client.emit('agent:interrupted');
      });

      geminiService.on('error', (error) => {
        this.logger.error('Gemini Live error:', error);
        client.emit('error', { message: error.message || 'Gemini Live error' });
      });

      geminiService.on('ready', async () => {
        this.logger.log('Gemini ready event received, sending greeting');
        client.emit('agent:ready');

        // Send greeting message to trigger agent response
        try {
          await geminiService.sendGreeting();
        } catch (error) {
          this.logger.error('Failed to send greeting:', error);
        }
      });

      // Load knowledge base if available
      let knowledgeBase: any = null;
      if (agent.knowledgeBaseId) {
        try {
          const kb = await this.agentService['knowledgeBaseModel'].findById(agent.knowledgeBaseId);
          if (kb) {
            knowledgeBase = {
              name: kb.name,
              description: kb.description,
              documents: kb.documents,
            };
          }
        } catch (error) {
          this.logger.error('Failed to load knowledge base:', error);
        }
      }

      // Build comprehensive system prompt
      let systemPrompt = `You are ${agent.name}, a professional voice agent.\n\n`;
      systemPrompt += agent.aiSettings?.systemPrompt || 'You are a helpful assistant.';
      systemPrompt += `\n\nYour name is: ${agent.name}`;
      systemPrompt += `\nYour role: Sales representative`;
      systemPrompt += `\nCompany: ${(agent as any).companyName || 'Our company'}`;

      // Configure service with full agent settings
      const config: GeminiLiveConfig = {
        agentId: data.agentId,
        systemPrompt: systemPrompt,
        voiceSettings: {
          voiceName: agent.voiceSettings?.voiceName || 'Aoede',
          language: agent.voiceSettings?.language || 'ru',
          speakingRate: agent.voiceSettings?.speakingRate || 1.0,
          pitch: agent.voiceSettings?.pitch || 0,
        },
        direction: 'inbound',
        greetingMessages: {
          inbound: agent.inboundGreetingMessage,
          outbound: agent.outboundGreetingMessage,
          fallback: agent.fallbackMessage,
          ending: agent.endingMessage,
        },
        temperature: agent.aiSettings?.temperature || 0.7,
        knowledgeBase: knowledgeBase,
      };

      // Connect to Gemini Live (after event listeners are set up)
      await geminiService.connect(config);

      // Store session
      this.sessions.set(client.id, {
        agentId: data.agentId,
        geminiService,
        socket: client,
      });

      client.emit('agent:started', {
        sessionId: geminiService.getSessionId(),
      });

    } catch (error) {
      this.logger.error('Failed to start agent:', error);
      client.emit('error', {
        message: error.message || 'Failed to start agent',
      });
    }
  }

  @SubscribeMessage('agent:audio')
  async handleAudio(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { audio: string }, // base64 encoded audio
  ) {
    try {
      const session = this.sessions.get(client.id);
      if (!session) {
        client.emit('error', { message: 'No active session' });
        return;
      }

      // Decode base64 audio
      const audioBuffer = Buffer.from(data.audio, 'base64');
      this.logger.debug(`Received audio from client: ${audioBuffer.length} bytes`);

      // Send to Gemini Live
      await session.geminiService.sendAudio(audioBuffer);

    } catch (error) {
      this.logger.error('Failed to send audio:', error);
      client.emit('error', {
        message: error.message || 'Failed to send audio',
      });
    }
  }

  @SubscribeMessage('agent:stop')
  async handleStopAgent(
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const session = this.sessions.get(client.id);
      if (session) {
        session.geminiService.disconnect();
        this.sessions.delete(client.id);
        client.emit('agent:stopped');
      }
    } catch (error) {
      this.logger.error('Failed to stop agent:', error);
      client.emit('error', {
        message: error.message || 'Failed to stop agent',
      });
    }
  }
}
