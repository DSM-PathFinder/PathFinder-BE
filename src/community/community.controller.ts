import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommunityService } from './community.service';

@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get()
  findPublic() {
    return this.communityService.findPublic();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/like')
  toggleLike(@Param('id') id: string, @Request() req: any) {
    return this.communityService.toggleLike(id, req.user.id);
  }
}
