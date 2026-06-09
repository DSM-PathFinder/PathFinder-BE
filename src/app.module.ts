import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RoadmapsModule } from './roadmaps/roadmaps.module';
import { NotesModule } from './notes/notes.module';
import { CommunityModule } from './community/community.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RoadmapsModule,
    NotesModule,
    CommunityModule,
    AiModule,
  ],
})
export class AppModule {}
