import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(data: {
    email: string;
    name: string;
    password?: string;
    provider?: string;
    providerId?: string;
  }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: data.password ?? '',
        provider: data.provider ?? 'local',
        providerId: data.providerId,
      },
    });
  }

  async update(id: string, data: { name?: string; bio?: string }) {
    return this.prisma.user.update({ where: { id }, data });
  }
}
