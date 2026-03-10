import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
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

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(SearchQuery)
    private readonly searchQueryRepo: Repository<SearchQuery>,
    @InjectRepository(FoundPurchase)
    private readonly foundPurchaseRepo: Repository<FoundPurchase>,
    @InjectRepository(PurchaseAiResult)
    private readonly aiResultRepo: Repository<PurchaseAiResult>,
    @InjectRepository(ParsedEmail)
    private readonly parsedEmailRepo: Repository<ParsedEmail>,
    @InjectRepository(ProzorroTender)
    private readonly prozorroTenderRepo: Repository<ProzorroTender>,
    @InjectRepository(ProzorroAiResult)
    private readonly prozorroAiRepo: Repository<ProzorroAiResult>,
    @InjectRepository(OutreachEmailAccount)
    private readonly emailAccountRepo: Repository<OutreachEmailAccount>,
    @InjectRepository(OutreachCampaign)
    private readonly campaignRepo: Repository<OutreachCampaign>,
    @InjectRepository(OutreachLead)
    private readonly leadRepo: Repository<OutreachLead>,
    @InjectRepository(OutreachCampaignEmail)
    private readonly campaignEmailRepo: Repository<OutreachCampaignEmail>,
  ) {}

  async getAdminDashboard() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalUsers,
      activeUsers,
      newUsersThisWeek,
      totalSearchQueries,
      totalFoundPurchases,
      totalFavorites,
      totalAiResults,
      totalEmails,
      totalProzorroTenders,
      totalProzorroAiResults,
      totalEmailAccounts,
      activeEmailAccounts,
      totalCampaigns,
      activeCampaigns,
      totalLeads,
      totalCampaignEmails,
      sentEmails,
      openedEmails,
      repliedEmails,
      bouncedEmails,
      byRoleRaw,
      recentUsers,
    ] = await Promise.all([
      this.userRepo.count(),
      this.userRepo.count({ where: { isActive: true } }),
      this.userRepo.count({ where: { createdAt: MoreThan(sevenDaysAgo) } }),
      this.searchQueryRepo.count(),
      this.foundPurchaseRepo.count(),
      this.foundPurchaseRepo.count({ where: { isFavorite: true } }),
      this.aiResultRepo.count(),
      this.parsedEmailRepo.count(),
      this.prozorroTenderRepo.count(),
      this.prozorroAiRepo.count(),
      this.emailAccountRepo.count(),
      this.emailAccountRepo.count({ where: { status: 'active' } }),
      this.campaignRepo.count(),
      this.campaignRepo.count({ where: { status: 'active' } }),
      this.leadRepo.count(),
      this.campaignEmailRepo.count(),
      this.campaignEmailRepo.count({ where: { status: 'sent' } }),
      this.campaignEmailRepo.count({ where: { status: 'opened' } }),
      this.campaignEmailRepo.count({ where: { status: 'replied' } }),
      this.campaignEmailRepo.count({ where: { status: 'bounced' } }),
      this.userRepo
        .createQueryBuilder('user')
        .select('user.role', 'role')
        .addSelect('COUNT(*)', 'count')
        .groupBy('user.role')
        .getRawMany(),
      this.userRepo.find({
        order: { createdAt: 'DESC' },
        take: 5,
        select: ['id', 'firstName', 'lastName', 'email', 'role', 'createdAt', 'isActive'],
      }),
    ]);

    const byRole: Record<string, number> = {};
    for (const row of byRoleRaw) {
      byRole[row.role] = parseInt(row.count, 10);
    }

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        newThisWeek: newUsersThisWeek,
        byRole,
      },
      purchases: {
        totalSearches: totalSearchQueries,
        totalFound: totalFoundPurchases,
        totalFavorites: totalFavorites,
        totalAiResults,
        totalEmails,
      },
      prozorro: {
        totalTenders: totalProzorroTenders,
        totalAiResults: totalProzorroAiResults,
      },
      outreach: {
        totalEmailAccounts,
        activeEmailAccounts,
        totalCampaigns,
        activeCampaigns,
        totalLeads,
        totalEmailsSent: sentEmails,
        totalEmailsOpened: openedEmails,
        totalEmailsReplied: repliedEmails,
        totalEmailsBounced: bouncedEmails,
        totalCampaignEmails,
      },
      recentUsers,
    };
  }

  async getUserDashboard(userId: string) {
    const [
      searchQueries,
      foundPurchases,
      favorites,
      aiResults,
      emailAccounts,
      campaigns,
      activeCampaigns,
      leads,
      sentEmails,
      repliedEmails,
      recentSearches,
    ] = await Promise.all([
      this.searchQueryRepo.count({ where: { userId } }),
      this.foundPurchaseRepo.count({ where: { userId } }),
      this.foundPurchaseRepo.count({ where: { userId, isFavorite: true } }),
      this.aiResultRepo.count({ where: { userId } }),
      this.emailAccountRepo.count({ where: { userId } }),
      this.campaignRepo.count({ where: { userId } }),
      this.campaignRepo.count({ where: { userId, status: 'active' } }),
      this.leadRepo.count({ where: { userId } }),
      this.campaignEmailRepo
        .createQueryBuilder('ce')
        .innerJoin('ce.campaign', 'c')
        .where('c.user_id = :userId', { userId })
        .andWhere('ce.status = :status', { status: 'sent' })
        .getCount(),
      this.campaignEmailRepo
        .createQueryBuilder('ce')
        .innerJoin('ce.campaign', 'c')
        .where('c.user_id = :userId', { userId })
        .andWhere('ce.status = :status', { status: 'replied' })
        .getCount(),
      this.searchQueryRepo.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 5,
      }),
    ]);

    return {
      purchases: {
        totalSearches: searchQueries,
        totalFound: foundPurchases,
        totalFavorites: favorites,
        totalAiResults: aiResults,
      },
      outreach: {
        emailAccounts,
        campaigns,
        activeCampaigns,
        leads,
        sentEmails,
        repliedEmails,
      },
      recentSearches,
    };
  }
}
