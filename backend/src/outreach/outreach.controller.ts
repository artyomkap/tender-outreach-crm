import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OutreachService } from './outreach.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Outreach')
@ApiBearerAuth()
@Controller('outreach')
@UseGuards(JwtAuthGuard)
export class OutreachController {
  constructor(private readonly outreachService: OutreachService) {}

  // ===================== DASHBOARD =====================

  @Get('dashboard')
  getDashboard(@CurrentUser() user: User) {
    return this.outreachService.getDashboardStats(user.id);
  }

  // ===================== EMAIL ACCOUNTS =====================

  @Get('email-accounts')
  getEmailAccounts(@CurrentUser() user: User) {
    return this.outreachService.getEmailAccounts(user.id);
  }

  @Post('email-accounts')
  createEmailAccount(
    @CurrentUser() user: User,
    @Body()
    body: {
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
  ) {
    return this.outreachService.createEmailAccount(user.id, body);
  }

  @Patch('email-accounts/:id')
  updateEmailAccount(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.outreachService.updateEmailAccount(id, user.id, body);
  }

  @Delete('email-accounts/:id')
  deleteEmailAccount(@CurrentUser() user: User, @Param('id') id: string) {
    return this.outreachService.deleteEmailAccount(id, user.id);
  }

  @Post('email-accounts/:id/test')
  testEmailAccount(@CurrentUser() user: User, @Param('id') id: string) {
    return this.outreachService.testEmailAccount(id, user.id);
  }

  // ===================== LEAD LISTS =====================

  @Get('lead-lists')
  getLeadLists(@CurrentUser() user: User) {
    return this.outreachService.getLeadLists(user.id);
  }

  @Post('lead-lists')
  createLeadList(
    @CurrentUser() user: User,
    @Body() body: { name: string; description?: string },
  ) {
    return this.outreachService.createLeadList(user.id, body.name, body.description);
  }

  @Delete('lead-lists/:id')
  deleteLeadList(@CurrentUser() user: User, @Param('id') id: string) {
    return this.outreachService.deleteLeadList(id, user.id);
  }

  // ===================== LEADS =====================

  @Get('lead-lists/:listId/leads')
  getLeads(
    @CurrentUser() user: User,
    @Param('listId') listId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.outreachService.getLeads(user.id, listId, page, limit);
  }

  @Post('lead-lists/:listId/leads')
  createLead(
    @CurrentUser() user: User,
    @Param('listId') listId: string,
    @Body()
    body: {
      email: string;
      firstName?: string;
      lastName?: string;
      company?: string;
      website?: string;
      position?: string;
      phone?: string;
    },
  ) {
    return this.outreachService.createLead(user.id, listId, body);
  }

  @Post('lead-lists/:listId/import')
  importLeads(
    @CurrentUser() user: User,
    @Param('listId') listId: string,
    @Body()
    body: {
      leads: Array<{
        email: string;
        firstName?: string;
        lastName?: string;
        company?: string;
        website?: string;
        position?: string;
        phone?: string;
      }>;
    },
  ) {
    return this.outreachService.importLeads(user.id, listId, body.leads);
  }

  @Delete('leads/:id')
  deleteLead(@CurrentUser() user: User, @Param('id') id: string) {
    return this.outreachService.deleteLead(id, user.id);
  }

  // ===================== CAMPAIGNS =====================

  @Get('campaigns')
  getCampaigns(@CurrentUser() user: User) {
    return this.outreachService.getCampaigns(user.id);
  }

  @Get('campaigns/:id')
  getCampaign(@CurrentUser() user: User, @Param('id') id: string) {
    return this.outreachService.getCampaign(id, user.id);
  }

  @Post('campaigns')
  createCampaign(
    @CurrentUser() user: User,
    @Body()
    body: {
      name: string;
      leadListId?: string;
      emailAccountIds?: string[];
      dailySendLimit?: number;
      sendFromHour?: number;
      sendToHour?: number;
      timezone?: string;
      trackOpens?: boolean;
    },
  ) {
    return this.outreachService.createCampaign(user.id, body);
  }

  @Patch('campaigns/:id')
  updateCampaign(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.outreachService.updateCampaign(id, user.id, body);
  }

  @Delete('campaigns/:id')
  deleteCampaign(@CurrentUser() user: User, @Param('id') id: string) {
    return this.outreachService.deleteCampaign(id, user.id);
  }

  // ===================== CAMPAIGN STEPS =====================

  @Post('campaigns/:id/steps')
  saveSteps(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body()
    body: {
      steps: Array<{ subject?: string; body: string; delayDays?: number; delayHours?: number }>;
    },
  ) {
    return this.outreachService.saveSteps(id, user.id, body.steps);
  }

  // ===================== CAMPAIGN ACTIONS =====================

  @Post('campaigns/:id/launch')
  launchCampaign(@CurrentUser() user: User, @Param('id') id: string) {
    return this.outreachService.launchCampaign(id, user.id);
  }

  @Post('campaigns/:id/pause')
  pauseCampaign(@CurrentUser() user: User, @Param('id') id: string) {
    return this.outreachService.pauseCampaign(id, user.id);
  }

  @Post('campaigns/:id/resume')
  resumeCampaign(@CurrentUser() user: User, @Param('id') id: string) {
    return this.outreachService.resumeCampaign(id, user.id);
  }

  @Post('campaigns/:id/send')
  processCampaignEmails(@CurrentUser() user: User, @Param('id') id: string) {
    return this.outreachService.processCampaignEmails(id, user.id);
  }

  // ===================== CAMPAIGN EMAILS =====================

  @Get('campaigns/:id/emails')
  getCampaignEmails(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.outreachService.getCampaignEmails(id, user.id, page, limit, status);
  }

  // ===================== INBOX =====================

  @Post('inbox/check-replies')
  checkReplies(@CurrentUser() user: User) {
    return this.outreachService.checkReplies(user.id);
  }

  @Get('inbox')
  getInbox(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.outreachService.getInbox(user.id, page, limit);
  }
}
