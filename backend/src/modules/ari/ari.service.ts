import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import * as AriClient from 'ari-client';

export interface AriChannel {
  id: string;
  name: string;
  state: string;
  caller: {
    name: string;
    number: string;
  };
  connected: {
    name: string;
    number: string;
  };
  creationtime: string;
  dialplan?: {
    context: string;
    exten: string;
    priority: number;
  };
}

export interface ExternalMediaConfig {
  app: string;
  external_host: string;
  format: string;
  encapsulation: string;
  transport: string;
  connection_type: string;
  direction: string;
}

/**
 * Service for managing Asterisk ARI connections and channel operations
 * Handles real-time communication with Asterisk for voice processing
 */
@Injectable()
export class AriService extends EventEmitter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AriService.name);
  private client: any = null;
  private connected: boolean = false;
  private activeChannels: Map<string, AriChannel> = new Map();

  // ARI connection config
  private ariUrl: string;
  private ariUser: string;
  private ariPassword: string;
  private ariApp: string = 'voxi-gemini';

  constructor(private configService: ConfigService) {
    super();

    this.ariUrl = this.configService.get<string>('ASTERISK_ARI_URL') || 'http://asterisk:8088';
    this.ariUser = this.configService.get<string>('ASTERISK_ARI_USER') || 'voxi';
    this.ariPassword = this.configService.get<string>('ASTERISK_ARI_PASSWORD') || 'voxi123';
  }

  async onModuleInit() {
    // Don't block app startup - connect in background
    this.connectToAsterisk()
      .then(() => {
        this.logger.log('ARI Service initialized and connected');
      })
      .catch((error) => {
        this.logger.warn('Failed to initialize ARI connection (will retry):', error.message);
      });

    this.logger.log('ARI Service initialization started (non-blocking)');
  }

  async onModuleDestroy() {
    try {
      if (this.client) {
        await this.disconnect();
      }
      this.logger.log('ARI Service destroyed');
    } catch (error) {
      this.logger.error('Error destroying ARI Service:', error);
    }
  }

  /**
   * Connect to Asterisk ARI
   */
  private async connectToAsterisk(): Promise<void> {
    try {
      this.logger.log(`Connecting to Asterisk ARI at ${this.ariUrl}`);

      this.client = await AriClient.connect(this.ariUrl, this.ariUser, this.ariPassword);
      this.connected = true;

      this.logger.log('Connected to Asterisk ARI');

      // Start Stasis application
      this.client.on('StasisStart', this.handleStasisStart.bind(this));
      this.client.on('StasisEnd', this.handleStasisEnd.bind(this));
      this.client.on('ChannelDestroyed', this.handleChannelDestroyed.bind(this));

      // Start the application
      this.client.start(this.ariApp);

      this.logger.log(`Stasis application '${this.ariApp}' started`);

    } catch (error) {
      this.logger.error('Failed to connect to Asterisk ARI:', error);
      this.connected = false;
      throw error;
    }
  }

  /**
   * Handle StasisStart event - called when channel enters Stasis
   */
  private async handleStasisStart(event: any, channel: any): Promise<void> {
    try {
      this.logger.log(`StasisStart: Channel ${channel.id} entered Stasis`);
      this.logger.log(`Caller: ${channel.caller.number} -> ${channel.connected.number}`);

      // Store channel info
      const channelInfo: AriChannel = {
        id: channel.id,
        name: channel.name,
        state: channel.state,
        caller: channel.caller,
        connected: channel.connected,
        creationtime: channel.creationtime,
        dialplan: channel.dialplan,
      };

      this.activeChannels.set(channel.id, channelInfo);

      // Emit event for other services to handle
      this.emit('channel:start', {
        channel: channelInfo,
        ariChannel: channel,
        args: event.args,
      });

    } catch (error) {
      this.logger.error(`Error handling StasisStart for channel ${channel.id}:`, error);
    }
  }

  /**
   * Handle StasisEnd event - called when channel exits Stasis
   */
  private async handleStasisEnd(event: any, channel: any): Promise<void> {
    try {
      this.logger.log(`StasisEnd: Channel ${channel.id} exited Stasis`);

      const channelInfo = this.activeChannels.get(channel.id);
      if (channelInfo) {
        this.emit('channel:end', { channel: channelInfo, ariChannel: channel });
        this.activeChannels.delete(channel.id);
      }

    } catch (error) {
      this.logger.error(`Error handling StasisEnd for channel ${channel.id}:`, error);
    }
  }

  /**
   * Handle ChannelDestroyed event
   */
  private async handleChannelDestroyed(event: any, channel: any): Promise<void> {
    try {
      this.logger.log(`ChannelDestroyed: ${channel.id}`);
      this.activeChannels.delete(channel.id);
    } catch (error) {
      this.logger.error(`Error handling ChannelDestroyed for channel ${channel.id}:`, error);
    }
  }

  /**
   * Answer a channel
   */
  async answerChannel(channelId: string): Promise<void> {
    if (!this.connected || !this.client) {
      throw new Error('ARI client not connected');
    }

    try {
      const channel = this.client.Channel();
      await channel.answer({ channelId });
      this.logger.log(`Answered channel: ${channelId}`);
    } catch (error) {
      this.logger.error(`Failed to answer channel ${channelId}:`, error);
      throw error;
    }
  }

  /**
   * Hangup a channel
   */
  async hangupChannel(channelId: string): Promise<void> {
    if (!this.connected || !this.client) {
      throw new Error('ARI client not connected');
    }

    try {
      const channel = this.client.Channel();
      await channel.hangup({ channelId });
      this.logger.log(`Hung up channel: ${channelId}`);
      this.activeChannels.delete(channelId);
    } catch (error) {
      this.logger.error(`Failed to hangup channel ${channelId}:`, error);
      throw error;
    }
  }

  /**
   * Create external media channel for audio streaming
   * This allows us to stream audio to/from Gemini Live
   */
  async createExternalMedia(config: ExternalMediaConfig): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('ARI client not connected');
    }

    try {
      this.logger.log('Creating external media channel:', config);

      const channel = this.client.Channel();
      const externalChannel = await channel.externalMedia({
        app: config.app,
        external_host: config.external_host,
        format: config.format,
        encapsulation: config.encapsulation,
        transport: config.transport,
        connection_type: config.connection_type,
        direction: config.direction,
      });

      this.logger.log(`External media channel created: ${externalChannel.id}`);
      return externalChannel;

    } catch (error) {
      this.logger.error('Failed to create external media channel:', error);
      throw error;
    }
  }

  /**
   * Create a bridge for connecting channels
   */
  async createBridge(type: string = 'mixing'): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('ARI client not connected');
    }

    try {
      const bridge = this.client.Bridge();
      const newBridge = await bridge.create({ type });
      this.logger.log(`Bridge created: ${newBridge.id}`);
      return newBridge;
    } catch (error) {
      this.logger.error('Failed to create bridge:', error);
      throw error;
    }
  }

  /**
   * Add channel to bridge
   */
  async addChannelToBridge(bridgeId: string, channelId: string): Promise<void> {
    if (!this.connected || !this.client) {
      throw new Error('ARI client not connected');
    }

    try {
      const bridge = this.client.Bridge();
      await bridge.addChannel({ bridgeId, channel: channelId });
      this.logger.log(`Added channel ${channelId} to bridge ${bridgeId}`);
    } catch (error) {
      this.logger.error(`Failed to add channel ${channelId} to bridge ${bridgeId}:`, error);
      throw error;
    }
  }

  /**
   * Remove channel from bridge
   */
  async removeChannelFromBridge(bridgeId: string, channelId: string): Promise<void> {
    if (!this.connected || !this.client) {
      throw new Error('ARI client not connected');
    }

    try {
      const bridge = this.client.Bridge();
      await bridge.removeChannel({ bridgeId, channel: channelId });
      this.logger.log(`Removed channel ${channelId} from bridge ${bridgeId}`);
    } catch (error) {
      this.logger.error(`Failed to remove channel ${channelId} from bridge ${bridgeId}:`, error);
      throw error;
    }
  }

  /**
   * Destroy a bridge
   */
  async destroyBridge(bridgeId: string): Promise<void> {
    if (!this.connected || !this.client) {
      throw new Error('ARI client not connected');
    }

    try {
      const bridge = this.client.Bridge();
      await bridge.destroy({ bridgeId });
      this.logger.log(`Bridge destroyed: ${bridgeId}`);
    } catch (error) {
      this.logger.error(`Failed to destroy bridge ${bridgeId}:`, error);
      throw error;
    }
  }

  /**
   * Disconnect from Asterisk
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        // Hangup all active channels
        for (const [channelId] of this.activeChannels) {
          await this.hangupChannel(channelId);
        }

        this.client.removeAllListeners();
        this.client = null;
        this.connected = false;
        this.logger.log('Disconnected from Asterisk ARI');
      } catch (error) {
        this.logger.error('Error disconnecting from Asterisk:', error);
      }
    }
  }

  /**
   * Check if connected to ARI
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get active channels
   */
  getActiveChannels(): Map<string, AriChannel> {
    return this.activeChannels;
  }

  /**
   * Get ARI client instance (for advanced operations)
   */
  getClient(): any {
    return this.client;
  }
}
