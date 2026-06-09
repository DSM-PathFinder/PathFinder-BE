import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AiService } from './ai.service';

@UseGuards(AuthGuard('jwt'))
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-roadmap')
  generateRoadmap(
    @Request() req: any,
    @Body()
    body: {
      level: string;
      goal: string;
      hours: number;
      selectedInterests: string[];
    },
  ) {
    return this.aiService.generateRoadmap(req.user.id, body);
  }

  @Post('replan')
  replan(
    @Request() req: any,
    @Body()
    body: {
      roadmapId: string;
      currentWeek: number;
      completedTasks: string[];
      remainingWeeks: number;
    },
  ) {
    return this.aiService.replan(req.user.id, body);
  }
}
