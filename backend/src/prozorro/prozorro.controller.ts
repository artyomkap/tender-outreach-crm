import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProzorroService } from './prozorro.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SearchProzorroDto } from './dto/search-prozorro.dto';

@ApiTags('Prozorro')
@ApiBearerAuth()
@Controller('prozorro')
@UseGuards(JwtAuthGuard)
export class ProzorroController {
  constructor(private readonly prozorroService: ProzorroService) {}

  @Get('search')
  search(@Query() dto: SearchProzorroDto) {
    return this.prozorroService.search(dto);
  }

  @Get('tender/:prozorroId')
  getTender(@Param('prozorroId') prozorroId: string) {
    return this.prozorroService.getTender(prozorroId);
  }

  @Post('docs/:docId/parse')
  parseDocument(
    @Param('docId') docId: string,
    @CurrentUser() user: User,
  ) {
    return this.prozorroService.parseDocument(docId, user);
  }

  @Post('tender/:tenderId/prepare')
  prepareTender(
    @Param('tenderId') tenderId: string,
    @CurrentUser() user: User,
  ) {
    return this.prozorroService.prepareTender(tenderId, user);
  }

  @Post('web-search')
  webSearch(
    @Body('searchQuery') searchQuery: string,
    @CurrentUser() user: User,
  ) {
    return this.prozorroService.webSearch(searchQuery, user);
  }

  @Get('web-results')
  getWebResults(
    @Query('searchQuery') searchQuery: string,
    @CurrentUser() user: User,
  ) {
    return this.prozorroService.getWebResults(user.id, searchQuery);
  }

  @Post('web-results/:id/parse-emails')
  parseEmails(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.prozorroService.parseEmails(id, user.id);
  }

  @Get('outreach')
  getOutreach(@CurrentUser() user: User) {
    return this.prozorroService.getOutreach(user.id);
  }

  @Get('letters')
  getLetters(@CurrentUser() user: User) {
    return this.prozorroService.getLetters(user.id);
  }

  @Get('blacklist')
  getBlacklist(@CurrentUser() user: User) {
    return this.prozorroService.getBlacklist(user.id);
  }

  @Post('blacklist')
  addBlacklist(
    @Body('email') email: string,
    @CurrentUser() user: User,
  ) {
    return this.prozorroService.addBlacklist(user.id, email);
  }

  @Delete('blacklist/:email')
  removeBlacklist(
    @Param('email') email: string,
    @CurrentUser() user: User,
  ) {
    return this.prozorroService.removeBlacklist(user.id, email);
  }
}
