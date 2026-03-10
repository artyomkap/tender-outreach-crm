import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { User } from '../users/entities/user.entity';
import { SearchQuery } from '../purchases/entities/search-query.entity';
import { FoundPurchase } from '../purchases/entities/found-purchase.entity';
import { PurchaseAiResult } from '../purchases/entities/purchase-ai-result.entity';
import { ParsedEmail } from '../purchases/entities/parsed-email.entity';
import { ProzorroTender } from '../prozorro/entities/prozorro-tender.entity';
import { ProzorroAiResult } from '../prozorro/entities/prozorro-ai-result.entity';
import { OutreachEmailAccount } from '../outreach/entities/email-account.entity';
import { OutreachCampaign } from '../outreach/entities/campaign.entity';
import { OutreachLead } from '../outreach/entities/lead.entity';
import { OutreachCampaignEmail } from '../outreach/entities/campaign-email.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      SearchQuery,
      FoundPurchase,
      PurchaseAiResult,
      ParsedEmail,
      ProzorroTender,
      ProzorroAiResult,
      OutreachEmailAccount,
      OutreachCampaign,
      OutreachLead,
      OutreachCampaignEmail,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
