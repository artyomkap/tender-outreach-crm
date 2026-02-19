import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { SearchPurchasesDto } from './dto/search-purchases.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Purchases')
@ApiBearerAuth()
@Controller('purchases')
@UseGuards(JwtAuthGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get('search')
  search(
    @Query() dto: SearchPurchasesDto,
    @CurrentUser() user: User,
  ) {
    return this.purchasesService.search(dto, user.id);
  }

  @Get('search-queries')
  getSearchQueries(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.purchasesService.getSearchQueries(user.id, page, limit);
  }

  @Get('found')
  getFoundPurchases(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.purchasesService.getFoundPurchases(user.id, page, limit);
  }

  @Get('favorites')
  getFavorites(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.purchasesService.getFavorites(user.id, page, limit);
  }

  @Post('favorites/:purchaseId')
  toggleFavorite(
    @CurrentUser() user: User,
    @Param('purchaseId') purchaseId: string,
  ) {
    return this.purchasesService.toggleFavorite(user.id, purchaseId);
  }

  @Get('history')
  getHistory(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.purchasesService.getHistory(user.id, page, limit);
  }

  @Get(':purchaseNumber')
  async getById(@Param('purchaseNumber') purchaseNumber: string) {
    const purchase = await this.purchasesService.getById(purchaseNumber);
    if (!purchase) {
      throw new NotFoundException('Закупка не найдена');
    }
    return purchase;
  }
}
