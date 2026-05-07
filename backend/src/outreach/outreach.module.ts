import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { OutreachEmailAccount } from './entities/email-account.entity';
import { OutreachLeadList } from './entities/lead-list.entity';
import { OutreachLead } from './entities/lead.entity';
import { OutreachCampaign } from './entities/campaign.entity';
import { OutreachCampaignStep } from './entities/campaign-step.entity';
import { OutreachCampaignLead } from './entities/campaign-lead.entity';
import { OutreachCampaignEmail } from './entities/campaign-email.entity';
import { OutreachService } from './outreach.service';
import { OutreachController } from './outreach.controller';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OutreachEmailAccount,
      OutreachLeadList,
      OutreachLead,
      OutreachCampaign,
      OutreachCampaignStep,
      OutreachCampaignLead,
      OutreachCampaignEmail,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
    }),
    ApiKeysModule,
    UsersModule,
  ],
  controllers: [OutreachController],
  providers: [OutreachService],
  exports: [OutreachService],
})
export class OutreachModule {}
