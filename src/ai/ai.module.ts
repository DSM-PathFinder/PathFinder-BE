import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { RoadmapsModule } from '../roadmaps/roadmaps.module';

@Module({
  imports: [RoadmapsModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
