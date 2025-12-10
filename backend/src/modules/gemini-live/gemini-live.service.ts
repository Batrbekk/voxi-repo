import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, LiveServerMessage, Modality, Session } from '@google/genai';

export interface GeminiLiveConfig {
  agentId: string;
  systemPrompt: string;
  voiceSettings?: {
    voiceName?: string;
    language?: string;
    speakingRate?: number;
    pitch?: number;
  };
  direction?: 'inbound' | 'outbound';
  greetingMessages?: {
    inbound?: string;
    outbound?: string;
    fallback?: string;
    ending?: string;
  };
  knowledgeBase?: any;
  temperature?: number;
}

export interface AudioChunk {
  data: Buffer;
  timestamp: number;
}

@Injectable()
export class GeminiLiveService extends EventEmitter {
  private readonly logger = new Logger(GeminiLiveService.name);
  private client: GoogleGenAI | null = null;
  private session: Session | null = null;
  private sessionId: string | null = null;
  private isConnected: boolean = false;
  private audioQueue: AudioChunk[] = [];
  private transcriptBuffer: string = '';
  private nextStartTime = 0;
  private outputAudioContext: any; // Will store audio context on client side

  constructor(private configService: ConfigService) {
    super();
    this.initClient();
  }

  private initClient(): void {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY is not configured');
      return;
    }

    this.client = new GoogleGenAI({
      apiKey,
    });
  }

  /**
   * Connect to Gemini Live API
   */
  async connect(config: GeminiLiveConfig): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('Gemini client not initialized');
      }

      this.sessionId = `live-${Date.now()}-${config.agentId}`;

      // Build model name
      const model = 'models/gemini-2.0-flash-exp';

      // Build system instruction
      const systemInstruction = this.buildSystemPrompt(config);

      // Connect to Gemini Live
      this.session = await this.client.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: config.voiceSettings?.voiceName || 'Aoede',
              },
            },
          },
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          generationConfig: {
            temperature: config.temperature || 0.7,
            topP: 0.95,
            topK: 40,
          },
        },
        callbacks: {
          onopen: () => {
            this.logger.log('Connected to Gemini Live API');
            this.isConnected = true;
            this.emit('ready');
          },
          onmessage: (message: LiveServerMessage) => {
            this.handleLiveMessage(message);
          },
          onerror: (error: ErrorEvent) => {
            this.logger.error('Gemini Live error:', error);
            this.emit('error', error);
          },
          onclose: (event: CloseEvent) => {
            this.logger.log('Disconnected from Gemini Live API');
            this.isConnected = false;
            this.emit('disconnected');
          },
        },
      });

      this.logger.log('Gemini Live session established');
    } catch (error) {
      this.logger.error('Failed to connect to Gemini Live:', error);
      throw error;
    }
  }

  /**
   * Handle messages from Gemini Live SDK
   */
  private handleLiveMessage(message: LiveServerMessage): void {
    try {
      this.logger.debug('Received message from Gemini Live');

      // Handle audio output
      const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData;
      if (audio && audio.data) {
        const audioBuffer = Buffer.from(audio.data, 'base64');
        this.logger.log(`Emitting audio chunk: ${audioBuffer.length} bytes, mimeType: ${audio.mimeType || 'audio/pcm'}`);
        this.emit('audio', {
          data: audioBuffer,
          mimeType: audio.mimeType || 'audio/pcm',
          timestamp: Date.now(),
        });
      }

      // Handle text transcript
      const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
      if (text) {
        this.logger.log(`Received transcript: ${text}`);
        this.transcriptBuffer += text;
        this.emit('transcript', {
          text,
          role: 'assistant',
          timestamp: Date.now(),
        });
      }

      // Handle turn complete
      if (message.serverContent?.turnComplete) {
        this.logger.log('Turn complete');
        this.emit('turnComplete', {
          transcript: this.transcriptBuffer,
        });
        this.transcriptBuffer = '';
      }

      // Handle interruption
      if (message.serverContent?.interrupted) {
        this.emit('interrupted');
        this.logger.log('User interrupted the assistant');
      }

      // Handle setup complete
      if (message.setupComplete) {
        this.logger.log('Setup complete, ready for conversation');
        this.emit('ready');
      }

      // Handle tool calls
      if (message.toolCall) {
        this.handleToolCall(message.toolCall);
      }
    } catch (error) {
      this.logger.error('Failed to handle live message:', error);
    }
  }

  /**
   * Build system prompt with agent instructions and RAG context
   */
  private buildSystemPrompt(config: GeminiLiveConfig): string {
    // Start with base prompt
    let prompt = config.systemPrompt || 'You are a helpful assistant.';

    // Add language instruction based on agent settings
    const language = config.voiceSettings?.language || 'ru';
    switch(language) {
      case 'ru':
        prompt += '\n\nIMPORTANT: Always respond in Russian language. You are speaking with Russian-speaking customers.';
        break;
      case 'en':
        prompt += '\n\nIMPORTANT: Always respond in English language.';
        break;
      case 'kz':
        prompt += '\n\nIMPORTANT: Always respond in Kazakh language. You are speaking with Kazakh-speaking customers.';
        break;
    }

    // Add greeting instructions based on call direction
    if (config.greetingMessages) {
      if (config.direction === 'inbound' && config.greetingMessages.inbound) {
        prompt += `\n\nFor inbound calls, start with: "${config.greetingMessages.inbound}"`;
      } else if (config.direction === 'outbound' && config.greetingMessages.outbound) {
        prompt += `\n\nFor outbound calls, start with: "${config.greetingMessages.outbound}"`;
      }

      if (config.greetingMessages.ending) {
        prompt += `\n\nEnd conversations politely with: "${config.greetingMessages.ending}"`;
      }

      if (config.greetingMessages.fallback) {
        prompt += `\n\nIf confused or need clarification, say: "${config.greetingMessages.fallback}"`;
      }
    }

    // Add voice characteristics instructions (since Gemini Live doesn't support speakingRate/pitch directly)
    if (config.voiceSettings?.speakingRate) {
      if (config.voiceSettings.speakingRate < 0.8) {
        prompt += '\n- Speak slowly and clearly';
      } else if (config.voiceSettings.speakingRate > 1.2) {
        prompt += '\n- Speak at a brisk, energetic pace';
      }
    }

    if (config.voiceSettings?.pitch) {
      if (config.voiceSettings.pitch < -5) {
        prompt += '\n- Use a deeper, more authoritative tone';
      } else if (config.voiceSettings.pitch > 5) {
        prompt += '\n- Use a lighter, more friendly tone';
      }
    }

    // Add knowledge base context if available
    if (config.knowledgeBase) {
      prompt += '\n\n## KNOWLEDGE BASE:\n';
      prompt += 'You have access to the following information. ALWAYS check this first before asking questions:\n';

      if (config.knowledgeBase.documents && config.knowledgeBase.documents.length > 0) {
        config.knowledgeBase.documents.forEach((doc: any, index: number) => {
          prompt += `\nDocument ${index + 1}:\n`;
          prompt += doc.content ? doc.content : JSON.stringify(doc);
          prompt += '\n---\n';
        });
      } else {
        prompt += JSON.stringify(config.knowledgeBase, null, 2);
      }
    }

    // Add specific behavior instructions
    prompt += '\n\n## IMPORTANT BEHAVIOR RULES:';
    prompt += '\n1. NEVER ask unnecessary questions if information is in the knowledge base';
    prompt += '\n2. When a customer asks about a specific product (like Hyundai Tucson):';
    prompt += '\n   - First check the knowledge base for this product';
    prompt += '\n   - If available, provide details from knowledge base';
    prompt += '\n   - If NOT available, say you will check availability and call back';
    prompt += '\n   - Do NOT ask about budget or purpose unless specifically relevant';
    prompt += '\n3. Give complete, helpful responses, not short answers';
    prompt += '\n4. Be proactive in offering information from the knowledge base';
    prompt += '\n5. Maintain professional but friendly tone';
    prompt += '\n6. Never repeat the same response twice';

    return prompt;
  }


  /**
   * Send audio chunk to Gemini Live
   */
  async sendAudio(audioBuffer: Buffer): Promise<void> {
    if (!this.isConnected || !this.session) {
      throw new Error('Not connected to Gemini Live');
    }

    try {
      // Send audio using the correct format from Google docs
      await this.session.sendRealtimeInput({
        audio: {
          data: audioBuffer.toString('base64'),
          mimeType: 'audio/pcm;rate=16000',
        },
      });
    } catch (error) {
      this.logger.error('Failed to send audio:', error);
      throw error;
    }
  }

  /**
   * Send text message to trigger greeting
   */
  async sendGreeting(): Promise<void> {
    if (!this.isConnected || !this.session) {
      throw new Error('Not connected to Gemini Live');
    }

    try {
      // Send a text message to trigger the greeting
      await this.session.sendRealtimeInput({
        text: 'Привет',
      });
      this.logger.log('Greeting message sent to trigger agent response');
    } catch (error) {
      this.logger.error('Failed to send greeting:', error);
      throw error;
    }
  }


  /**
   * Handle tool calls (function calling)
   */
  private handleToolCall(toolCall: any): void {
    this.emit('toolCall', toolCall);

    // Process tool call and send response
    // Note: Tool calling not fully implemented yet in Gemini Live SDK
    // For now, just emit the event
    this.logger.log('Tool call received:', toolCall);
  }

  /**
   * Process tool calls (implement actual functionality)
   */
  private async processToolCall(toolCall: any): Promise<any> {
    const functionName = toolCall.functionCalls[0].name;
    const args = toolCall.functionCalls[0].args;

    switch (functionName) {
      case 'searchKnowledgeBase':
        // Implement knowledge base search
        return {
          results: [
            {
              title: 'Sample Result',
              content: 'This would be actual knowledge base content',
              relevance: 0.95,
            },
          ],
        };

      case 'scheduleAppointment':
        // Implement appointment scheduling
        return {
          success: true,
          appointmentId: `apt-${Date.now()}`,
          message: 'Appointment scheduled successfully',
        };

      default:
        return {
          error: `Unknown function: ${functionName}`,
        };
    }
  }

  /**
   * Disconnect from Gemini Live
   */
  disconnect(): void {
    if (this.session) {
      this.session.close();
      this.session = null;
      this.isConnected = false;
      this.sessionId = null;
      this.logger.log('Session disconnected');
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Check if connected
   */
  isActive(): boolean {
    return this.isConnected;
  }
}