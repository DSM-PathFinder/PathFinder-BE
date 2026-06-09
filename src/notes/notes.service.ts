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

  async create(
    userId: string,
    data: { title: string; content?: string; weekId?: string },
  ) {
    return this.prisma.note.create({ data: { ...data, userId } });
  }

  async update(
    id: string,
    userId: string,
    data: { title?: string; content?: string },
  ) {
    await this.findOne(id, userId);
    return this.prisma.note.update({ where: { id }, data });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.note.delete({ where: { id } });
  }
}
