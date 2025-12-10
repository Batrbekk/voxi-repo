import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiLiveService, GeminiLiveConfig } from '../gemini-live/gemini-live.service';
import { AriService } from './ari.service';
import { EventEmitter } from 'events';
import * as dgram from 'dgram';

export interface AriBridgeConfig extends GeminiLiveConfig {
  channelId: string;
  callerNumber: string;
  calledNumber: string;
  direction: 'inbound' | 'outbound';
}

/**
 * Bridge between Asterisk ARI and Gemini Live API
 * Handles bidirectional audio streaming via RTP
 */
@Injectable()
export class AriGeminiBridge extends EventEmitter {
  private readonly logger = new Logger(AriGeminiBridge.name);
  private geminiService: GeminiLiveService | null = null;
  private ariService: AriService;
  private isActive: boolean = false;

  // RTP handling
  private rtpSocket: dgram.Socket | null = null;
  private rtpPort: number = 0;
  private externalMediaChannel: any = null;
  private bridge: any = null;

  // Audio buffers
  private audioBuffer: Buffer[] = [];
  private recordingBuffer: Buffer[] = [];

  // Conversation tracking
  private conversationStartTime: Date | null = null;
  private transcriptSegments: Array<{
    role: 'user' | 'assistant';
    text: string;
    timestamp: number;
  }> = [];

  constructor(
    private configService: ConfigService,
    ariService: AriService,
  ) {
    super();
    this.ariService = ariService;
  }

  /**
   * Start the bridge between ARI channel and Gemini Live
   */
  async start(channelId: string, config: AriBridgeConfig): Promise<void> {
    try {
      this.logger.log(`Starting ARI-Gemini bridge for channel ${channelId}`);
      this.conversationStartTime = new Date();
      this.isActive = true;

      // Create Gemini Live service instance
      this.geminiService = new GeminiLiveService(this.configService);

      // Set up Gemini handlers BEFORE connecting
      this.setupGeminiHandlers();

      // Add ready handler to send greeting
      this.geminiService.on('ready', async () => {
        this.logger.log('Gemini ready, sending greeting for ARI call');
        try {
          if (this.geminiService) {
            await this.geminiService.sendGreeting();
          }
        } catch (error) {
          this.logger.error('Failed to send greeting:', error);
        }
      });

      // Connect to Gemini Live
      await this.geminiService.connect(config);

      // Answer the channel
      await this.ariService.answerChannel(channelId);

      // Create RTP socket for receiving audio from Asterisk
      await this.setupRtpSocket();

      // Create external media channel in Asterisk
      await this.setupExternalMedia(channelId);

      // Create bridge and connect channels
      await this.setupBridge(channelId);

      this.emit('bridgeStarted', {
        channelId: config.channelId,
        callerNumber: config.callerNumber,
      });

    } catch (error) {
      this.logger.error('Failed to start ARI-Gemini bridge:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Set up Gemini Live event handlers
   */
  private setupGeminiHandlers(): void {
    if (!this.geminiService) return;

    // Handle audio from Gemini (to be sent to Asterisk)
    this.geminiService.on('audio', async (audioData: any) => {
      try {
        // Convert Gemini audio format to RTP format for Asterisk
        const rtpAudio = await this.convertGeminiToRtp(audioData.data);

        // Send to Asterisk via RTP
        if (this.rtpSocket && this.isActive) {
          // Send RTP packet to external media
          this.sendRtpPacket(rtpAudio);

          // Store for recording
          this.recordingBuffer.push(Buffer.from(audioData.data, 'base64'));
        }
      } catch (error) {
        this.logger.error('Failed to send audio to Asterisk:', error);
      }
    });

    // Handle transcripts
    this.geminiService.on('transcript', (transcript: any) => {
      this.transcriptSegments.push({
        role: transcript.role || 'assistant',
        text: transcript.text,
        timestamp: transcript.timestamp,
      });

      this.emit('transcript', transcript);
      this.logger.debug(`Transcript: ${transcript.text}`);
    });

    // Handle turn completion
    this.geminiService.on('turnComplete', (data: any) => {
      this.emit('turnComplete', data);
    });

    // Handle interruptions
    this.geminiService.on('interrupted', () => {
      this.logger.log('User interrupted the assistant');
      this.emit('interrupted');
    });

    // Handle errors
    this.geminiService.on('error', (error: any) => {
      this.logger.error('Gemini Live error:', error);
      this.emit('error', error);
    });

    // Handle disconnection
    this.geminiService.on('disconnected', () => {
      this.logger.log('Gemini Live disconnected');
      this.stop();
    });
  }

  /**
   * Set up RTP socket for receiving audio from Asterisk
   */
  private async setupRtpSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.rtpSocket = dgram.createSocket('udp4');

      this.rtpSocket.on('listening', () => {
        const address = this.rtpSocket!.address();
        this.rtpPort = address.port;
        this.logger.log(`RTP socket listening on port ${this.rtpPort}`);
        resolve();
      });

      this.rtpSocket.on('message', async (msg: Buffer) => {
        try {
          // Parse RTP packet
          const rtpPayload = this.parseRtpPacket(msg);

          if (rtpPayload && this.isActive && this.geminiService) {
            // Buffer audio chunks
            this.audioBuffer.push(rtpPayload);

            // Send to Gemini when we have enough data
            if (this.audioBuffer.length >= 10) {
              const audioData = Buffer.concat(this.audioBuffer);
              this.audioBuffer = [];

              // Convert RTP audio to PCM for Gemini
              const pcmAudio = await this.convertRtpToGemini(audioData);

              // Send to Gemini Live
              await this.geminiService.sendAudio(pcmAudio);

              // Store for recording
              this.recordingBuffer.push(audioData);
            }
          }
        } catch (error) {
          this.logger.error('Error processing RTP packet:', error);
        }
      });

      this.rtpSocket.on('error', (error) => {
        this.logger.error('RTP socket error:', error);
        reject(error);
      });

      // Bind to random port
      this.rtpSocket.bind();
    });
  }

  /**
   * Create external media channel in Asterisk
   */
  private async setupExternalMedia(channelId: string): Promise<void> {
    try {
      const backendHost = this.configService.get<string>('BACKEND_HOST') || 'backend';

      this.externalMediaChannel = await this.ariService.createExternalMedia({
        app: 'voxi-gemini',
        external_host: `${backendHost}:${this.rtpPort}`,
        format: 'ulaw',
        encapsulation: 'rtp',
        transport: 'udp',
        connection_type: 'client',
        direction: 'both',
      });

      this.logger.log(`External media channel created: ${this.externalMediaChannel.id}`);
    } catch (error) {
      this.logger.error('Failed to create external media channel:', error);
      throw error;
    }
  }

  /**
   * Create bridge and connect channels
   */
  private async setupBridge(channelId: string): Promise<void> {
    try {
      // Create mixing bridge
      this.bridge = await this.ariService.createBridge('mixing');

      // Add incoming call channel to bridge
      await this.ariService.addChannelToBridge(this.bridge.id, channelId);

      // Add external media channel to bridge
      await this.ariService.addChannelToBridge(this.bridge.id, this.externalMediaChannel.id);

      this.logger.log(`Bridge created and channels connected: ${this.bridge.id}`);
    } catch (error) {
      this.logger.error('Failed to setup bridge:', error);
      throw error;
    }
  }

  /**
   * Parse RTP packet and extract payload
   */
  private parseRtpPacket(packet: Buffer): Buffer | null {
    try {
      // RTP header is 12 bytes minimum
      if (packet.length < 12) {
        return null;
      }

      // Skip RTP header (12 bytes + CSRC + extension if present)
      const version = (packet[0] >> 6) & 0x03;
      const padding = (packet[0] >> 5) & 0x01;
      const extension = (packet[0] >> 4) & 0x01;
      const csrcCount = packet[0] & 0x0F;

      let offset = 12 + (csrcCount * 4);

      // Skip extension if present
      if (extension) {
        const extLength = packet.readUInt16BE(offset + 2) * 4;
        offset += 4 + extLength;
      }

      // Extract payload
      const payload = packet.slice(offset);
      return payload;
    } catch (error) {
      this.logger.error('Error parsing RTP packet:', error);
      return null;
    }
  }

  /**
   * Send RTP packet
   */
  private sendRtpPacket(payload: Buffer): void {
    if (!this.rtpSocket) return;

    try {
      // Create RTP header
      const header = Buffer.alloc(12);
      header[0] = 0x80; // V=2, P=0, X=0, CC=0
      header[1] = 0x00; // M=0, PT=0 (PCMU)

      // Combine header and payload
      const packet = Buffer.concat([header, payload]);

      // Send to external media
      // Note: In production, we would send to the actual RTP endpoint
      // For now, this is a placeholder
    } catch (error) {
      this.logger.error('Error sending RTP packet:', error);
    }
  }

  /**
   * Convert RTP audio (G.711 μ-law) to PCM for Gemini
   */
  private async convertRtpToGemini(audioData: Buffer): Promise<Buffer> {
    // G.711 μ-law to Linear PCM conversion
    const pcmBuffer = Buffer.alloc(audioData.length * 2);

    for (let i = 0; i < audioData.length; i++) {
      const sample = this.mulawToPcm(audioData[i]);
      pcmBuffer.writeInt16LE(sample, i * 2);
    }

    return pcmBuffer;
  }

  /**
   * Convert Gemini PCM to RTP format (G.711 μ-law)
   */
  private async convertGeminiToRtp(base64Audio: string): Promise<Buffer> {
    const pcmData = Buffer.from(base64Audio, 'base64');
    const mulawBuffer = Buffer.alloc(pcmData.length / 2);

    for (let i = 0; i < pcmData.length; i += 2) {
      const sample = pcmData.readInt16LE(i);
      mulawBuffer[i / 2] = this.pcmToMulaw(sample);
    }

    return mulawBuffer;
  }

  /**
   * μ-law to PCM conversion
   */
  private mulawToPcm(mulaw: number): number {
    const BIAS = 0x84;
    mulaw = ~mulaw;
    const sign = mulaw & 0x80;
    const exponent = (mulaw >> 4) & 0x07;
    const mantissa = mulaw & 0x0F;
    let sample = (mantissa << 3) + BIAS;
    sample = sample << exponent;
    return sign ? -sample : sample;
  }

  /**
   * PCM to μ-law conversion
   */
  private pcmToMulaw(pcm: number): number {
    const BIAS = 0x84;
    const CLIP = 32635;
    let sign = 0;

    if (pcm < 0) {
      sign = 0x80;
      pcm = -pcm;
    }

    if (pcm > CLIP) pcm = CLIP;
    pcm += BIAS;

    let exponent = 7;
    for (let expMask = 0x4000; (pcm & expMask) === 0 && exponent > 0; exponent--, expMask >>= 1) {}

    const mantissa = (pcm >> (exponent + 3)) & 0x0F;
    const mulaw = ~(sign | (exponent << 4) | mantissa);

    return mulaw & 0xFF;
  }

  /**
   * Stop the bridge and clean up
   */
  async stop(): Promise<void> {
    if (!this.isActive) return;

    this.logger.log('Stopping ARI-Gemini bridge');
    this.isActive = false;

    // Disconnect from Gemini
    if (this.geminiService) {
      this.geminiService.disconnect();
      this.geminiService.removeAllListeners();
      this.geminiService = null;
    }

    // Clean up Asterisk resources
    try {
      if (this.bridge) {
        await this.ariService.destroyBridge(this.bridge.id);
        this.bridge = null;
      }

      if (this.externalMediaChannel) {
        await this.ariService.hangupChannel(this.externalMediaChannel.id);
        this.externalMediaChannel = null;
      }
    } catch (error) {
      this.logger.error('Error cleaning up Asterisk resources:', error);
    }

    // Close RTP socket
    if (this.rtpSocket) {
      this.rtpSocket.close();
      this.rtpSocket = null;
    }

    // Emit conversation ended event
    const duration = this.conversationStartTime
      ? (Date.now() - this.conversationStartTime.getTime()) / 1000
      : 0;

    this.emit('bridgeEnded', {
      duration,
      transcriptSegments: this.transcriptSegments,
      recordingBuffer: Buffer.concat(this.recordingBuffer),
    });

    // Clear buffers
    this.audioBuffer = [];
    this.recordingBuffer = [];
    this.transcriptSegments = [];
    this.conversationStartTime = null;
  }

  /**
   * Get current conversation data
   */
  getConversationData(): any {
    return {
      isActive: this.isActive,
      duration: this.conversationStartTime
        ? (Date.now() - this.conversationStartTime.getTime()) / 1000
        : 0,
      transcriptCount: this.transcriptSegments.length,
      recordingSize: this.recordingBuffer.reduce((acc, buf) => acc + buf.length, 0),
    };
  }
}
