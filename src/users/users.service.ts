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
    const updateData: { name?: string; bio?: string } = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.bio !== undefined) updateData.bio = data.bio;

    const { password, ...user } = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });
    return user;
  }
}
