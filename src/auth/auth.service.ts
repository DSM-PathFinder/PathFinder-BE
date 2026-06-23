import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

interface OAuthUserData {
  email: string;
  name: string;
  provider: string;
  providerId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async findOrCreateOAuthUser(data: OAuthUserData) {
    let user = await this.usersService.findByEmail(data.email);

    if (!user) {
      user = await this.usersService.create({
        email: data.email,
        name: data.name,
        password: '',
        provider: data.provider,
        providerId: data.providerId,
      });
    }

    return user;
  }

  generateToken(userId: string) {
    return this.jwtService.sign({ sub: userId });
  }

  getProfile(user: any) {
    const { password, ...rest } = user;
    return rest;
  }

  async updateProfile(userId: string, data: { name?: string; bio?: string }) {
    return this.usersService.update(userId, data);
  }
}
