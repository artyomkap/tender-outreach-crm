import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
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

  @Get('files/:fileId/preview-content')
  getFilePreviewContent(@Param('fileId') fileId: string) {
    return this.purchasesService.getFilePreviewContent(fileId);
  }

  @Post('files/:fileId/parse')
  parseFile(
    @Param('fileId') fileId: string,
    @CurrentUser() user: User,
  ) {
    return this.purchasesService.parseAndSaveFileText(fileId, user);
  }

  @Get('files/:fileId/text')
  getFileText(@Param('fileId') fileId: string) {
    return this.purchasesService.getFileText(fileId);
  }

  @Get('ai-results')
  getUserAiResults(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.purchasesService.getUserAiResults(user.id, page, limit);
  }

  @Get('ai-search-terms')
  getUserSearchTerms(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.purchasesService.getUserSearchTerms(user.id, page, limit);
  }

  @Get('emails')
  getUserEmails(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.purchasesService.getUserEmails(user.id, page, limit);
  }

  @Get('prepared-letters')
  getPreparedLetters(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.purchasesService.getPreparedLetters(user.id, page, limit);
  }

  @Get('pipeline-counts')
  getBatchPipelineCounts(
    @CurrentUser() user: User,
    @Query('ids') ids: string,
  ) {
    const purchaseIds = (ids || '').split(',').filter(Boolean);
    return this.purchasesService.getBatchPipelineCounts(purchaseIds, user.id);
  }

  @Post('web-search/:searchTermId')
  executeWebSearch(
    @Param('searchTermId') searchTermId: string,
    @CurrentUser() user: User,
  ) {
    return this.purchasesService.executeWebSearch(searchTermId, user);
  }

  @Get('web-search/:searchTermId/results')
  getWebSearchResults(
    @Param('searchTermId') searchTermId: string,
    @CurrentUser() user: User,
  ) {
    return this.purchasesService.getWebSearchResults(searchTermId, user.id);
  }

  @Post('web-search-results/:resultId/parse-emails')
  parseEmails(
    @Param('resultId') resultId: string,
    @CurrentUser() user: User,
  ) {
    return this.purchasesService.parseEmailsFromSite(resultId, user.id);
  }

  @Post(':purchaseId/prepare')
  preparePurchase(
    @Param('purchaseId') purchaseId: string,
    @CurrentUser() user: User,
  ) {
    return this.purchasesService.preparePurchase(purchaseId, user);
  }

  @Post(':purchaseId/approve-to-outreach')
  approveToOutreach(
    @Param('purchaseId') purchaseId: string,
    @CurrentUser() user: User,
    @Body('emails') emails: string[],
    @Body('subject') subject: string,
    @Body('body') body: string,
  ) {
    return this.purchasesService.approveToOutreach(purchaseId, user.id, { emails, subject, body });
  }

  @Get(':purchaseId/ai-result')
  getAiResult(
    @Param('purchaseId') purchaseId: string,
    @CurrentUser() user: User,
  ) {
    return this.purchasesService.getAiResult(purchaseId, user.id);
  }

  @Get(':purchaseId/pipeline')
  getPipelineDetail(
    @Param('purchaseId') purchaseId: string,
    @CurrentUser() user: User,
  ) {
    return this.purchasesService.getPurchasePipelineDetail(purchaseId, user.id);
  }

  @Get('blacklist')
  getBlacklist(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.purchasesService.getBlacklist(user.id, page, limit);
  }

  @Post('blacklist')
  addToBlacklist(
    @CurrentUser() user: User,
    @Body('email') email: string,
  ) {
    return this.purchasesService.addToBlacklist(user.id, email);
  }

  @Delete('blacklist/:email')
  removeFromBlacklist(
    @CurrentUser() user: User,
    @Param('email') email: string,
  ) {
    return this.purchasesService.removeFromBlacklist(user.id, email);
  }

  @Delete('found/by-query/:searchQueryId')
  deleteFoundPurchasesByQueryId(
    @Param('searchQueryId') searchQueryId: string,
    @CurrentUser() user: User,
  ) {
    const qid = searchQueryId === 'null' ? null : searchQueryId;
    return this.purchasesService.deleteFoundPurchasesByQueryId(qid, user.id);
  }

  @Delete('found/:id')
  deleteFoundPurchase(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.purchasesService.deleteFoundPurchase(id, user.id);
  }

  @Delete('search-queries/:id')
  deleteSearchQuery(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.purchasesService.deleteSearchQuery(id, user.id);
  }

  @Delete('history/by-query')
  deleteHistoryByQuery(
    @Query('q') searchQuery: string | undefined,
    @CurrentUser() user: User,
  ) {
    const q = searchQuery === undefined || searchQuery === '' ? null : searchQuery;
    return this.purchasesService.deleteHistoryByQuery(q, user.id);
  }

  @Delete('history/:id')
  deleteHistory(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.purchasesService.deleteHistory(id, user.id);
  }

  @Delete('ai-results/:id')
  deleteAiResult(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.purchasesService.deleteAiResult(id, user.id);
  }

  @Delete('ai-search-terms/:id')
  deleteSearchTerm(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.purchasesService.deleteSearchTerm(id, user.id);
  }

  @Delete('web-search-results/:id')
  deleteWebSearchResult(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.purchasesService.deleteWebSearchResult(id, user.id);
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
