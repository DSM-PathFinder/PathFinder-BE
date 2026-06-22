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
    data: {
      title: string;
      goal: string;
      isPublic?: boolean;
      category?: string;
    },
  ) {
    return this.prisma.roadmap.create({
      data: { ...data, userId },
      include: { weeks: { include: { tasks: true, resources: true } } },
    });
  }

  async update(
    id: string,
    userId: string,
    data: {
      title?: string;
      goal?: string;
      isPublic?: boolean;
      category?: string;
    },
  ) {
    await this.findOne(id, userId);
    return this.prisma.roadmap.update({
      where: { id },
      data,
      include: {
        weeks: {
          include: { tasks: true, resources: true },
          orderBy: { weekNumber: 'asc' },
        },
        _count: { select: { likes: true } },
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

    const newCompleted = !task.completed;

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        completed: newCompleted,
        completedAt: newCompleted ? new Date() : null,
      },
    });

    if (newCompleted) {
      await this.updateStreak(userId);
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
      if (diffDays === 0) {
        newStreak = user.streak || 1;
      } else if (diffDays === 1) {
        newStreak = user.streak + 1;
      } else {
        newStreak = 1;
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { streak: newStreak, lastActiveAt: new Date() },
    });
  }

  async getUserStats(userId: string) {
    const roadmaps = await this.prisma.roadmap.findMany({
      where: { userId },
      include: {
        weeks: { include: { tasks: true } },
        _count: { select: { likes: true } },
      },
    });

    let totalTasks = 0;
    let completedTasks = 0;
    let totalEstimatedHours = 0;
    let completedWeeks = 0;
    let totalWeeks = 0;
    let totalLikes = 0;

    for (const r of roadmaps) {
      totalLikes += r._count.likes;
      for (const w of r.weeks) {
        totalWeeks++;
        totalEstimatedHours += w.estimatedHours;
        const weekTaskCount = w.tasks.length;
        const weekCompletedCount = w.tasks.filter((t) => t.completed).length;
        totalTasks += weekTaskCount;
        completedTasks += weekCompletedCount;
        if (weekTaskCount > 0 && weekCompletedCount === weekTaskCount)
          completedWeeks++;
      }
    }

    const studiedHours =
      totalEstimatedHours > 0
        ? Math.round(
            (completedTasks / Math.max(totalTasks, 1)) * totalEstimatedHours,
          )
        : 0;

    const overallProgress =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    return {
      studiedHours,
      overallProgress,
      completedWeeks,
      totalWeeks,
      totalLikes,
      streak: user?.streak ?? 0,
    };
  }

  async getWeeklyChartData(userId: string, roadmapId: string) {
    const roadmap = await this.findOne(roadmapId, userId);
    return roadmap.weeks.map((w) => {
      const total = w.tasks.length;
      const done = w.tasks.filter((t) => t.completed).length;
      const actual =
        total > 0 ? Math.round((done / total) * w.estimatedHours) : 0;
      return {
        name: `Week ${w.weekNumber}`,
        hours: actual,
        expected: w.estimatedHours,
      };
    });
  }

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
      include: { weeks: { include: { tasks: true, resources: true } } },
    });
  }

  async replaceWeeksFromAI(
    id: string,
    userId: string,
    fromWeek: number,
    aiWeeks: any[],
  ) {
    await this.findOne(id, userId);

    const toDelete = await this.prisma.week.findMany({
      where: { roadmapId: id, weekNumber: { gte: fromWeek } },
    });
    await this.prisma.week.deleteMany({
      where: { id: { in: toDelete.map((w) => w.id) } },
    });

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
