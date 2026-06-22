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
import { NotesService } from './notes.service';

@UseGuards(AuthGuard('jwt'))
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get('by-task/:taskId')
  findByTask(@Param('taskId') taskId: string, @Request() req: any) {
    return this.notesService.findByTask(taskId, req.user.id);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.notesService.findAllByUser(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.notesService.findOne(id, req.user.id);
  }

  @Post()
  create(
    @Request() req: any,
    @Body()
    body: { title: string; content?: string; weekId?: string; taskId?: string },
  ) {
    return this.notesService.create(req.user.id, body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { title?: string; content?: string },
  ) {
    return this.notesService.update(id, req.user.id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.notesService.remove(id, req.user.id);
  }
}
