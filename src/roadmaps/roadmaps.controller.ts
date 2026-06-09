import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RoadmapsService } from './roadmaps.service';

@UseGuards(AuthGuard('jwt'))
@Controller('roadmaps')
export class RoadmapsController {
  constructor(private readonly roadmapsService: RoadmapsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.roadmapsService.findAllByUser(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.roadmapsService.findOne(id, req.user.id);
  }

  @Post()
  create(
    @Request() req: any,
    @Body() body: { title: string; goal: string; isPublic?: boolean },
  ) {
    return this.roadmapsService.create(req.user.id, body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { title?: string; goal?: string; isPublic?: boolean },
  ) {
    return this.roadmapsService.update(id, req.user.id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.roadmapsService.remove(id, req.user.id);
  }

  @Patch('tasks/:taskId/toggle')
  toggleTask(@Param('taskId') taskId: string, @Request() req: any) {
    return this.roadmapsService.toggleTask(taskId, req.user.id);
  }
}
