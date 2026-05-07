import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  Sse,
  UnauthorizedException,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { EmailsService } from './emails.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Emails')
@ApiBearerAuth()
@Controller('emails')
@UseGuards(JwtAuthGuard)
export class EmailsController {
  constructor(
    private readonly emailsService: EmailsService,
    private readonly jwtService: JwtService,
  ) {}

  @Sse('events')
  @UseGuards() // override — no JwtAuthGuard, EventSource can't send headers
  emailEvents(@Query('token') token: string): Observable<MessageEvent> {
    let userId: string;
    try {
      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
      });
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException('Неверный токен');
    }
    const stream = this.emailsService.getOrCreateStream(userId);
    return stream.asObservable().pipe(
      map((data) => ({ data: JSON.stringify(data) } as MessageEvent)),
    );
  }

  private resolveEmailSettings(user: User) {
    const s = user.settings || {};
    return {
      smtpHost: s.smtpHost || process.env.SMTP_HOST,
      smtpPort: s.smtpPort || (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined),
      smtpUser: s.smtpUser || process.env.SMTP_USER,
      smtpPass: s.smtpPass || process.env.SMTP_PASS,
      smtpSecure: s.smtpSecure ?? (process.env.SMTP_SECURE === 'true'),
      emailFrom: s.emailFrom || process.env.EMAIL_FROM,
      smtpRelayUrl: s.smtpRelayUrl || process.env.SMTP_RELAY_URL,
      imapHost: s.imapHost || process.env.IMAP_HOST,
      imapPort: s.imapPort || (process.env.IMAP_PORT ? parseInt(process.env.IMAP_PORT, 10) : undefined),
      imapUser: s.imapUser || process.env.IMAP_USER,
      imapPass: s.imapPass || process.env.IMAP_PASS,
      imapSecure: s.imapSecure ?? (process.env.IMAP_SECURE !== 'false'),
    };
  }

  @Post('send')
  sendEmail(
    @CurrentUser() user: User,
    @Body('to') to: string,
    @Body('subject') subject: string,
    @Body('body') body: string,
    @Body('purchaseId') purchaseId?: string,
    @Body('inReplyTo') inReplyTo?: string,
  ) {
    return this.emailsService.sendEmail(
      user.id,
      this.resolveEmailSettings(user),
      to,
      subject,
      body,
      purchaseId,
      inReplyTo,
    );
  }

  @Post('fetch-inbox')
  fetchInbox(@CurrentUser() user: User) {
    return this.emailsService.fetchInbox(user.id, this.resolveEmailSettings(user));
  }

  @Get('threads')
  getThreads(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.emailsService.getThreads(user.id, page, limit);
  }

  @Get('thread')
  getThread(
    @CurrentUser() user: User,
    @Query('email') email: string,
  ) {
    return this.emailsService.getThread(user.id, email);
  }
}
