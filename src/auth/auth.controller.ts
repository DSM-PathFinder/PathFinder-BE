import {
  Controller,
  Get,
  UseGuards,
  Request,
  Res,
  Patch,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Request() req: any, @Res() res: Response) {
    const token = this.authService.generateToken(req.user.id);
    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubLogin() {}

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  githubCallback(@Request() req: any, @Res() res: Response) {
    const token = this.authService.generateToken(req.user.id);
    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@Request() req: any) {
    return this.authService.getProfile(req.user);
  }

  @Patch('profile')
  @UseGuards(AuthGuard('jwt'))
  updateProfile(
    @Request() req: any,
    @Body() body: { name?: string; bio?: string },
  ) {
    return this.authService.updateProfile(req.user.id, body);
  }
}
