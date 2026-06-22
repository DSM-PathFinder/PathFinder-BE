import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(userId: string) {
    return this.prisma.note.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const note = await this.prisma.note.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('노트를 찾을 수 없습니다');
    if (note.userId !== userId) throw new ForbiddenException();
    return note;
  }

  async findByTask(taskId: string, userId: string) {
    return this.prisma.note.findFirst({
      where: { taskId, userId },
    });
  }

  async create(
    userId: string,
    data: { title: string; content?: string; weekId?: string; taskId?: string },
  ) {
    return this.prisma.note.create({ data: { ...data, userId } });
  }

  async update(
    id: string,
    userId: string,
    data: { title?: string; content?: string },
  ) {
    const note = await this.findOne(id, userId);
    const updated = await this.prisma.note.update({ where: { id }, data });

    if (note.taskId && data.content && data.content.trim().length > 0) {
      const task = await this.prisma.task.findUnique({
        where: { id: note.taskId },
      });
      if (task && !task.completed) {
        await this.prisma.task.update({
          where: { id: note.taskId },
          data: { completed: true, completedAt: new Date() },
        });
        await this.updateStreak(userId);
      }
    }

    return updated;
  }

  private async updateStreak(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    const now = new Date();
    const last = user.lastActiveAt;
    let newStreak = user.streak;

    if (!last) {
      newStreak = 1;
    } else {
      const diffDays = Math.floor(
        (now.setHours(0, 0, 0, 0) - new Date(last).setHours(0, 0, 0, 0)) /
          (1000 * 60 * 60 * 24),
      );
      if (diffDays === 0) newStreak = user.streak || 1;
      else if (diffDays === 1) newStreak = user.streak + 1;
      else newStreak = 1;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { streak: newStreak, lastActiveAt: new Date() },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.note.delete({ where: { id } });
  }
}
