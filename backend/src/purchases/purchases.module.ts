import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Purchase } from './entities/purchase.entity';
import { PurchaseFile } from './entities/purchase-file.entity';
import { UserPurchaseHistory } from './entities/user-purchase-history.entity';
import { SearchQuery } from './entities/search-query.entity';
import { FoundPurchase } from './entities/found-purchase.entity';
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
    ]),
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
