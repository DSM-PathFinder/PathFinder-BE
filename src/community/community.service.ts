import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublic(category?: string) {
    return this.prisma.roadmap.findMany({
      where: {
        isPublic: true,
        ...(category && category !== 'All' ? { category } : {}),
      },
      include: {
        user: { select: { id: true, name: true, plan: true } },
        weeks: {
          include: { tasks: true, resources: true },
          orderBy: { weekNumber: 'asc' },
        },
        _count: { select: { likes: true } },
      },
      orderBy: { likes: { _count: 'desc' } },
    });
  }

  async toggleLike(roadmapId: string, userId: string) {
    const existing = await this.prisma.like.findUnique({
      where: { userId_roadmapId: { userId, roadmapId } },
    });

    if (existing) {
      await this.prisma.like.delete({
        where: { userId_roadmapId: { userId, roadmapId } },
      });
      return { liked: false };
    } else {
      await this.prisma.like.create({ data: { userId, roadmapId } });
      return { liked: true };
    }
  }
}
