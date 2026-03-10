import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { OutreachEmailAccount } from './entities/email-account.entity';
import { OutreachLeadList } from './entities/lead-list.entity';
import { OutreachLead } from './entities/lead.entity';
import { OutreachCampaign } from './entities/campaign.entity';
import { OutreachCampaignStep } from './entities/campaign-step.entity';
import { OutreachCampaignLead } from './entities/campaign-lead.entity';
import { OutreachCampaignEmail } from './entities/campaign-email.entity';

@Injectable()
export class OutreachService {
  private readonly logger = new Logger(OutreachService.name);

  constructor(
    @InjectRepository(OutreachEmailAccount)
    private readonly emailAccountRepo: Repository<OutreachEmailAccount>,
    @InjectRepository(OutreachLeadList)
    private readonly leadListRepo: Repository<OutreachLeadList>,
    @InjectRepository(OutreachLead)
    private readonly leadRepo: Repository<OutreachLead>,
    @InjectRepository(OutreachCampaign)
    private readonly campaignRepo: Repository<OutreachCampaign>,
    @InjectRepository(OutreachCampaignStep)
    private readonly stepRepo: Repository<OutreachCampaignStep>,
    @InjectRepository(OutreachCampaignLead)
    private readonly campaignLeadRepo: Repository<OutreachCampaignLead>,
    @InjectRepository(OutreachCampaignEmail)
    private readonly campaignEmailRepo: Repository<OutreachCampaignEmail>,
  ) {}

  // ===================== EMAIL ACCOUNTS =====================

  async getEmailAccounts(userId: string): Promise<OutreachEmailAccount[]> {
    return this.emailAccountRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async createEmailAccount(
    userId: string,
    data: {
      email: string;
      senderName?: string;
      smtpHost: string;
      smtpPort?: number;
      smtpUser: string;
      smtpPass: string;
      imapHost?: string;
      imapPort?: number;
      imapUser?: string;
      imapPass?: string;
      dailyLimit?: number;
      signature?: string;
      smtpRelayUrl?: string;
    },
  ): Promise<OutreachEmailAccount> {
    const account = this.emailAccountRepo.create({
      userId,
      email: data.email,
      senderName: data.senderName || null,
      smtpHost: data.smtpHost,
      smtpPort: data.smtpPort || 587,
      smtpUser: data.smtpUser,
      smtpPass: data.smtpPass,
      imapHost: data.imapHost || null,
      imapPort: data.imapPort || null,
      imapUser: data.imapUser || null,
      imapPass: data.imapPass || null,
      dailyLimit: data.dailyLimit || 50,
      signature: data.signature || null,
      smtpRelayUrl: data.smtpRelayUrl || null,
    });
    return this.emailAccountRepo.save(account);
  }

  async updateEmailAccount(
    id: string,
    userId: string,
    data: Partial<{
      email: string;
      senderName: string;
      smtpHost: string;
      smtpPort: number;
      smtpUser: string;
      smtpPass: string;
      imapHost: string;
      imapPort: number;
      imapUser: string;
      imapPass: string;
      dailyLimit: number;
      isWarmupEnabled: boolean;
      status: 'active' | 'paused' | 'error';
      signature: string;
      smtpRelayUrl: string;
    }>,
  ): Promise<OutreachEmailAccount> {
    await this.emailAccountRepo.update({ id, userId }, data);
    const account = await this.emailAccountRepo.findOne({ where: { id, userId } });
    if (!account) throw new NotFoundException('Аккаунт не найден');
    return account;
  }

  async deleteEmailAccount(id: string, userId: string): Promise<void> {
    await this.emailAccountRepo.delete({ id, userId });
  }

  async testEmailAccount(id: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const account = await this.emailAccountRepo.findOne({ where: { id, userId } });
    if (!account) throw new NotFoundException('Аккаунт не найден');

    try {
      if (account.smtpRelayUrl) {
        // Test via relay: send a test ping
        const response = await fetch(account.smtpRelayUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Relay-Secret': process.env.SMTP_RELAY_SECRET || '',
          },
          body: JSON.stringify({
            smtpHost: account.smtpHost,
            smtpPort: account.smtpPort,
            smtpUser: account.smtpUser,
            smtpPass: account.smtpPass,
            smtpSecure: account.smtpPort === 465,
            emailFrom: account.email,
            to: account.email,
            subject: 'Coldy Test — проверка подключения',
            body: 'Тестовое письмо. Подключение работает.',
          }),
          signal: AbortSignal.timeout(30000),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) {
          throw new Error(result.error || `Relay returned ${response.status}`);
        }
      } else {
        const transporter = nodemailer.createTransport({
          host: account.smtpHost,
          port: account.smtpPort,
          secure: account.smtpPort === 465,
          auth: { user: account.smtpUser, pass: account.smtpPass },
          connectionTimeout: 10000,
          tls: { rejectUnauthorized: false, servername: account.smtpHost },
        });
        await transporter.verify();
      }
      await this.emailAccountRepo.update(id, { status: 'active', lastError: null });
      return { success: true };
    } catch (err: any) {
      const errorMsg = err.message || 'Неизвестная ошибка';
      await this.emailAccountRepo.update(id, { status: 'error', lastError: errorMsg });
      return { success: false, error: errorMsg };
    }
  }

  // ===================== LEAD LISTS =====================

  async getLeadLists(userId: string): Promise<OutreachLeadList[]> {
    return this.leadListRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async createLeadList(userId: string, name: string, description?: string): Promise<OutreachLeadList> {
    const list = this.leadListRepo.create({ userId, name, description: description || null });
    return this.leadListRepo.save(list);
  }

  async deleteLeadList(id: string, userId: string): Promise<void> {
    await this.leadRepo.delete({ leadListId: id, userId });
    await this.leadListRepo.delete({ id, userId });
  }

  // ===================== LEADS =====================

  async getLeads(
    userId: string,
    leadListId: string,
    page = 1,
    limit = 50,
  ): Promise<{ data: OutreachLead[]; total: number }> {
    const [data, total] = await this.leadRepo.findAndCount({
      where: { userId, leadListId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async createLead(
    userId: string,
    leadListId: string,
    data: {
      email: string;
      firstName?: string;
      lastName?: string;
      company?: string;
      website?: string;
      position?: string;
      phone?: string;
    },
  ): Promise<OutreachLead> {
    const lead = this.leadRepo.create({
      userId,
      leadListId,
      email: data.email,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      company: data.company || null,
      website: data.website || null,
      position: data.position || null,
      phone: data.phone || null,
    });
    const saved = await this.leadRepo.save(lead);
    await this.leadListRepo.increment({ id: leadListId }, 'leadsCount', 1);
    return saved;
  }

  async importLeads(
    userId: string,
    leadListId: string,
    leads: Array<{
      email: string;
      firstName?: string;
      lastName?: string;
      company?: string;
      website?: string;
      position?: string;
      phone?: string;
    }>,
  ): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;

    for (const row of leads) {
      if (!row.email || !row.email.includes('@')) {
        skipped++;
        continue;
      }
      const exists = await this.leadRepo.findOne({
        where: { userId, leadListId, email: row.email },
      });
      if (exists) {
        skipped++;
        continue;
      }
      await this.leadRepo.save(
        this.leadRepo.create({
          userId,
          leadListId,
          email: row.email,
          firstName: row.firstName || null,
          lastName: row.lastName || null,
          company: row.company || null,
          website: row.website || null,
          position: row.position || null,
          phone: row.phone || null,
        }),
      );
      imported++;
    }

    await this.leadListRepo.update({ id: leadListId }, { leadsCount: () => `(SELECT COUNT(*) FROM outreach_leads WHERE lead_list_id = '${leadListId}')` });

    return { imported, skipped };
  }

  async deleteLead(id: string, userId: string): Promise<void> {
    const lead = await this.leadRepo.findOne({ where: { id, userId } });
    if (!lead) return;
    await this.leadRepo.delete({ id });
    await this.leadListRepo.decrement({ id: lead.leadListId }, 'leadsCount', 1);
  }

  // ===================== CAMPAIGNS =====================

  async getCampaigns(userId: string): Promise<OutreachCampaign[]> {
    return this.campaignRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: ['steps'],
    });
  }

  async getCampaign(id: string, userId: string): Promise<OutreachCampaign> {
    const campaign = await this.campaignRepo.findOne({
      where: { id, userId },
      relations: ['steps', 'campaignLeads', 'campaignLeads.lead'],
    });
    if (!campaign) throw new NotFoundException('Кампания не найдена');
    campaign.steps = (campaign.steps || []).sort((a, b) => a.stepNumber - b.stepNumber);
    return campaign;
  }

  async createCampaign(
    userId: string,
    data: {
      name: string;
      leadListId?: string;
      emailAccountIds?: string[];
      dailySendLimit?: number;
      sendFromHour?: number;
      sendToHour?: number;
      timezone?: string;
      trackOpens?: boolean;
    },
  ): Promise<OutreachCampaign> {
    const campaign = this.campaignRepo.create({
      userId,
      name: data.name,
      leadListId: data.leadListId || null,
      emailAccountIds: data.emailAccountIds || [],
      dailySendLimit: data.dailySendLimit || 50,
      sendFromHour: data.sendFromHour ?? 9,
      sendToHour: data.sendToHour ?? 18,
      timezone: data.timezone || 'Europe/Moscow',
      trackOpens: data.trackOpens ?? false,
    });
    return this.campaignRepo.save(campaign);
  }

  async updateCampaign(
    id: string,
    userId: string,
    data: Partial<{
      name: string;
      leadListId: string;
      emailAccountIds: string[];
      dailySendLimit: number;
      sendFromHour: number;
      sendToHour: number;
      timezone: string;
      trackOpens: boolean;
      status: 'draft' | 'active' | 'paused' | 'completed';
    }>,
  ): Promise<OutreachCampaign> {
    await this.campaignRepo.update({ id, userId }, data);
    return this.getCampaign(id, userId);
  }

  async deleteCampaign(id: string, userId: string): Promise<void> {
    await this.campaignEmailRepo.delete({ campaignId: id });
    await this.campaignLeadRepo.delete({ campaignId: id });
    await this.stepRepo.delete({ campaignId: id });
    await this.campaignRepo.delete({ id, userId });
  }

  // ===================== CAMPAIGN STEPS =====================

  async saveSteps(
    campaignId: string,
    userId: string,
    steps: Array<{ subject?: string; body: string; delayDays?: number; delayHours?: number }>,
  ): Promise<OutreachCampaignStep[]> {
    // Verify ownership
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId, userId } });
    if (!campaign) throw new NotFoundException('Кампания не найдена');

    // Delete old steps
    await this.stepRepo.delete({ campaignId });

    // Create new steps
    const entities = steps.map((s, i) =>
      this.stepRepo.create({
        campaignId,
        stepNumber: i + 1,
        subject: s.subject || null,
        body: s.body,
        delayDays: s.delayDays ?? (i === 0 ? 0 : 2),
        delayHours: s.delayHours ?? 0,
      }),
    );
    return this.stepRepo.save(entities);
  }

  // ===================== CAMPAIGN LAUNCH =====================

  async launchCampaign(id: string, userId: string): Promise<OutreachCampaign> {
    const campaign = await this.getCampaign(id, userId);
    if (!campaign.leadListId) throw new BadRequestException('Выберите список лидов');
    if (campaign.emailAccountIds.length === 0) throw new BadRequestException('Выберите почтовые аккаунты');
    if (!campaign.steps || campaign.steps.length === 0) throw new BadRequestException('Добавьте шаги цепочки');

    // Load leads from the lead list
    const leads = await this.leadRepo.find({
      where: { leadListId: campaign.leadListId, userId, status: 'active' },
    });
    if (leads.length === 0) throw new BadRequestException('Список лидов пуст');

    // Create campaign leads
    const now = new Date();
    const campaignLeads = leads.map((lead) =>
      this.campaignLeadRepo.create({
        campaignId: id,
        leadId: lead.id,
        currentStep: 0,
        status: 'pending',
        nextSendAt: now,
      }),
    );
    await this.campaignLeadRepo.save(campaignLeads);

    // Activate campaign
    await this.campaignRepo.update({ id }, { status: 'active' });
    campaign.status = 'active';

    return campaign;
  }

  async pauseCampaign(id: string, userId: string): Promise<void> {
    await this.campaignRepo.update({ id, userId }, { status: 'paused' });
  }

  async resumeCampaign(id: string, userId: string): Promise<void> {
    await this.campaignRepo.update({ id, userId }, { status: 'active' });
  }

  // ===================== SEND EMAILS (called by scheduler/manually) =====================

  async processCampaignEmails(campaignId: string, userId: string): Promise<{ sent: number; errors: number }> {
    const campaign = await this.getCampaign(campaignId, userId);
    if (campaign.status !== 'active') return { sent: 0, errors: 0 };

    const accounts = await this.emailAccountRepo.find({
      where: { id: In(campaign.emailAccountIds), userId, status: 'active' },
    });
    if (accounts.length === 0) return { sent: 0, errors: 0 };

    // Get pending campaign leads that need to be sent now
    const pendingLeads = await this.campaignLeadRepo.find({
      where: {
        campaignId,
        status: In(['pending', 'in_progress']),
        nextSendAt: LessThanOrEqual(new Date()),
      },
      relations: ['lead'],
      take: campaign.dailySendLimit,
    });

    let sent = 0;
    let errors = 0;
    let accountIndex = 0;

    for (const cl of pendingLeads) {
      const step = campaign.steps.find((s) => s.stepNumber === cl.currentStep + 1);
      if (!step) {
        await this.campaignLeadRepo.update(cl.id, { status: 'completed' });
        continue;
      }

      const account = accounts[accountIndex % accounts.length];
      accountIndex++;

      // Personalize email
      const subject = this.personalizeText(step.subject || '', cl.lead);
      const body = this.personalizeText(step.body, cl.lead);

      try {
        await this.sendSingleEmail(account, cl.lead.email, subject, body);

        // Save email record
        await this.campaignEmailRepo.save(
          this.campaignEmailRepo.create({
            campaignId,
            campaignStepId: step.id,
            campaignLeadId: cl.id,
            leadId: cl.lead.id,
            emailAccountId: account.id,
            toEmail: cl.lead.email,
            subject,
            body,
            status: 'sent',
            sentAt: new Date(),
          }),
        );

        // Update campaign lead
        const nextStep = campaign.steps.find((s) => s.stepNumber === step.stepNumber + 1);
        if (nextStep) {
          const nextSendAt = new Date();
          nextSendAt.setDate(nextSendAt.getDate() + nextStep.delayDays);
          nextSendAt.setHours(nextSendAt.getHours() + nextStep.delayHours);
          await this.campaignLeadRepo.update(cl.id, {
            currentStep: step.stepNumber,
            status: 'in_progress',
            nextSendAt,
          });
        } else {
          await this.campaignLeadRepo.update(cl.id, {
            currentStep: step.stepNumber,
            status: 'completed',
          });
        }

        sent++;
        await this.campaignRepo.increment({ id: campaignId }, 'statsSent', 1);

        // Random delay between sends (2-8 seconds to simulate human)
        await new Promise((r) => setTimeout(r, 2000 + Math.random() * 6000));
      } catch (err: any) {
        this.logger.error(`Send failed to ${cl.lead.email}: ${err.message}`);
        errors++;

        await this.campaignEmailRepo.save(
          this.campaignEmailRepo.create({
            campaignId,
            campaignStepId: step.id,
            campaignLeadId: cl.id,
            leadId: cl.lead.id,
            emailAccountId: account.id,
            toEmail: cl.lead.email,
            subject,
            body,
            status: 'failed',
            errorMessage: err.message,
          }),
        );
      }
    }

    // Check if campaign is completed
    const remaining = await this.campaignLeadRepo.count({
      where: { campaignId, status: In(['pending', 'in_progress']) },
    });
    if (remaining === 0) {
      await this.campaignRepo.update({ id: campaignId }, { status: 'completed' });
    }

    return { sent, errors };
  }

  private personalizeText(text: string, lead: OutreachLead): string {
    return text
      .replace(/\{\{firstName\}\}/g, lead.firstName || '')
      .replace(/\{\{lastName\}\}/g, lead.lastName || '')
      .replace(/\{\{company\}\}/g, lead.company || '')
      .replace(/\{\{email\}\}/g, lead.email)
      .replace(/\{\{position\}\}/g, lead.position || '')
      .replace(/\{\{website\}\}/g, lead.website || '')
      .replace(/\{\{phone\}\}/g, lead.phone || '');
  }

  private async sendSingleEmail(
    account: OutreachEmailAccount,
    to: string,
    subject: string,
    body: string,
  ): Promise<void> {
    const fullBody = body + (account.signature ? `\n\n${account.signature}` : '');
    const emailFrom = account.senderName
      ? `"${account.senderName}" <${account.email}>`
      : account.email;

    if (account.smtpRelayUrl) {
      // Send via relay
      const response = await fetch(account.smtpRelayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Relay-Secret': process.env.SMTP_RELAY_SECRET || '',
        },
        body: JSON.stringify({
          smtpHost: account.smtpHost,
          smtpPort: account.smtpPort,
          smtpUser: account.smtpUser,
          smtpPass: account.smtpPass,
          smtpSecure: account.smtpPort === 465,
          emailFrom: account.email,
          to,
          subject,
          body: fullBody,
        }),
        signal: AbortSignal.timeout(30000),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || `Relay returned ${response.status}`);
      }
    } else {
      // Direct SMTP
      const transporter = nodemailer.createTransport({
        host: account.smtpHost,
        port: account.smtpPort,
        secure: account.smtpPort === 465,
        auth: { user: account.smtpUser, pass: account.smtpPass },
        connectionTimeout: 15000,
        tls: { rejectUnauthorized: false, servername: account.smtpHost },
      });

      await transporter.sendMail({
        from: emailFrom,
        to,
        subject,
        text: fullBody,
      });
    }
  }

  // ===================== CAMPAIGN EMAILS / INBOX =====================

  async getCampaignEmails(
    campaignId: string,
    userId: string,
    page = 1,
    limit = 50,
    status?: string,
  ): Promise<{ data: OutreachCampaignEmail[]; total: number }> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId, userId } });
    if (!campaign) throw new NotFoundException('Кампания не найдена');

    const where: any = { campaignId };
    if (status) where.status = status;

    const [data, total] = await this.campaignEmailRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async getInbox(userId: string, page = 1, limit = 50): Promise<{ data: OutreachCampaignEmail[]; total: number }> {
    const campaigns = await this.campaignRepo.find({ where: { userId }, select: ['id'] });
    if (campaigns.length === 0) return { data: [], total: 0 };

    const campaignIds = campaigns.map((c) => c.id);
    const [data, total] = await this.campaignEmailRepo.findAndCount({
      where: { campaignId: In(campaignIds), status: 'replied' },
      order: { repliedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  // ===================== DASHBOARD STATS =====================

  async getDashboardStats(userId: string): Promise<{
    totalAccounts: number;
    activeAccounts: number;
    totalLeads: number;
    totalCampaigns: number;
    activeCampaigns: number;
    totalSent: number;
    totalOpened: number;
    totalReplied: number;
    totalBounced: number;
  }> {
    const accounts = await this.emailAccountRepo.find({ where: { userId } });
    const leadLists = await this.leadListRepo.find({ where: { userId } });
    const campaigns = await this.campaignRepo.find({ where: { userId } });

    const totalLeads = leadLists.reduce((sum, l) => sum + l.leadsCount, 0);

    return {
      totalAccounts: accounts.length,
      activeAccounts: accounts.filter((a) => a.status === 'active').length,
      totalLeads,
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter((c) => c.status === 'active').length,
      totalSent: campaigns.reduce((sum, c) => sum + c.statsSent, 0),
      totalOpened: campaigns.reduce((sum, c) => sum + c.statsOpened, 0),
      totalReplied: campaigns.reduce((sum, c) => sum + c.statsReplied, 0),
      totalBounced: campaigns.reduce((sum, c) => sum + c.statsBounced, 0),
    };
  }
}
