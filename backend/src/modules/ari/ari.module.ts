import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AriService } from './ari.service';
import { AriGeminiBridge } from './ari-gemini-bridge.service';

@Module({
  imports: [ConfigModule],
  providers: [AriService, AriGeminiBridge],
  exports: [AriService, AriGeminiBridge],
})
export class AriModule {}
