import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoadmapsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(userId: string) {
    return this.prisma.roadmap.findMany({
      where: { userId },
      include: {
        weeks: {
          include: { tasks: true, resources: true },
          orderBy: { weekNumber: 'asc' },
        },
        _count: { select: { likes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const roadmap = await this.prisma.roadmap.findUnique({
      where: { id },
      include: {
        weeks: {
          include: { tasks: true, resources: true },
          orderBy: { weekNumber: 'asc' },
        },
        _count: { select: { likes: true } },
      },
    });
    if (!roadmap) throw new NotFoundException('로드맵을 찾을 수 없습니다');
    if (roadmap.userId !== userId) throw new ForbiddenException();
    return roadmap;
  }

  async create(
    userId: string,
    data: { title: string; goal: string; isPublic?: boolean },
  ) {
    return this.prisma.roadmap.create({
      data: { ...data, userId },
      include: {
        weeks: { include: { tasks: true, resources: true } },
      },
    });
  }

  async update(
    id: string,
    userId: string,
    data: { title?: string; goal?: string; isPublic?: boolean },
  ) {
    await this.findOne(id, userId);
    return this.prisma.roadmap.update({
      where: { id },
      data,
      include: {
        weeks: { include: { tasks: true, resources: true } },
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.roadmap.delete({ where: { id } });
  }

  async toggleTask(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { week: { include: { roadmap: true } } },
    });
    if (!task) throw new NotFoundException('태스크를 찾을 수 없습니다');
    if (task.week.roadmap.userId !== userId) throw new ForbiddenException();

    return this.prisma.task.update({
      where: { id: taskId },
      data: { completed: !task.completed },
    });
  }

  // Claude AI가 생성한 로드맵 데이터를 DB에 저장
  async createFromAI(userId: string, aiData: any) {
    return this.prisma.roadmap.create({
      data: {
        title: aiData.title,
        goal: aiData.goal,
        isPublic: false,
        userId,
        weeks: {
          create: aiData.weeks.map((w: any, idx: number) => ({
            weekNumber: idx + 1,
            theme: w.theme,
            description: w.description,
            estimatedHours: w.estimatedHours ?? 0,
            tasks: {
              create: w.tasks.map((t: any) => ({
                title: t.title,
                completed: false,
              })),
            },
            resources: {
              create: w.resources.map((r: any) => ({
                title: r.title,
                url: r.url ?? '#',
                type: r.type ?? 'doc',
              })),
            },
          })),
        },
      },
      include: {
        weeks: { include: { tasks: true, resources: true } },
      },
    });
  }

  // 재플랜: 특정 주차 이후 weeks를 교체
  async replaceWeeksFromAI(
    id: string,
    userId: string,
    fromWeek: number,
    aiWeeks: any[],
  ) {
    await this.findOne(id, userId);

    // fromWeek 이후 weeks 삭제
    const toDelete = await this.prisma.week.findMany({
      where: { roadmapId: id, weekNumber: { gte: fromWeek } },
    });
    await this.prisma.week.deleteMany({
      where: { id: { in: toDelete.map((w) => w.id) } },
    });

    // 새 weeks 생성
    for (const [i, w] of aiWeeks.entries()) {
      await this.prisma.week.create({
        data: {
          roadmapId: id,
          weekNumber: fromWeek + i,
          theme: w.theme,
          description: w.description,
          estimatedHours: w.estimatedHours ?? 0,
          tasks: {
            create: w.tasks.map((t: any) => ({
              title: t.title,
              completed: false,
            })),
          },
          resources: {
            create: w.resources.map((r: any) => ({
              title: r.title,
              url: r.url ?? '#',
              type: r.type ?? 'doc',
            })),
          },
        },
      });
    }

    return this.findOne(id, userId);
  }
}
