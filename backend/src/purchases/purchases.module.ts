import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Purchase } from './entities/purchase.entity';
import { PurchaseFile } from './entities/purchase-file.entity';
import { UserPurchaseHistory } from './entities/user-purchase-history.entity';
import { SearchQuery } from './entities/search-query.entity';
import { FoundPurchase } from './entities/found-purchase.entity';
import { PurchaseAiResult } from './entities/purchase-ai-result.entity';
import { AiSearchTerm } from './entities/ai-search-term.entity';
import { AiSearchTermPurchase } from './entities/ai-search-term-purchase.entity';
import { WebSearchResult } from './entities/web-search-result.entity';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Purchase,
      PurchaseFile,
      UserPurchaseHistory,
      SearchQuery,
      FoundPurchase,
      PurchaseAiResult,
      AiSearchTerm,
      AiSearchTermPurchase,
      WebSearchResult,
    ]),
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
