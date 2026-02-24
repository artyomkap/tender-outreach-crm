import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailMessage } from './entities/email-message.entity';
import * as nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';

interface SmtpSettings {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  emailFrom?: string;
}

interface ImapSettings {
  imapHost?: string;
  imapPort?: number;
  imapUser?: string;
  imapPass?: string;
  imapSecure?: boolean;
}

@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);

  constructor(
    @InjectRepository(EmailMessage)
    private readonly emailMessageRepository: Repository<EmailMessage>,
  ) {}

  // --- Send email via SMTP ---

  async sendEmail(
    userId: string,
    settings: SmtpSettings,
    to: string,
    subject: string,
    body: string,
    purchaseId?: string,
    inReplyTo?: string,
  ): Promise<EmailMessage> {
    const { smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure, emailFrom } =
      settings;

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new BadRequestException(
        'Настройте SMTP в профиле (host, user, password)',
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort || (smtpSecure ? 465 : 587),
      secure: smtpSecure ?? false,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
    });

    const from = emailFrom || smtpUser;

    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        text: body,
        ...(inReplyTo ? { inReplyTo, references: inReplyTo } : {}),
      });

      const message = this.emailMessageRepository.create({
        userId,
        direction: 'sent',
        contactEmail: to.toLowerCase(),
        subject,
        bodyText: body,
        messageId: info.messageId || null,
        inReplyTo: inReplyTo || null,
        purchaseId: purchaseId || null,
        isRead: true,
      });

      return this.emailMessageRepository.save(message);
    } catch (error: any) {
      this.logger.error(`SMTP send failed: ${error.message}`);
      throw new BadRequestException(`Ошибка отправки: ${error.message}`);
    }
  }

  // --- Fetch inbox via IMAP (using simple fetch approach) ---

  async fetchInbox(
    userId: string,
    settings: ImapSettings & SmtpSettings,
  ): Promise<{ fetched: number }> {
    const { imapHost, imapPort, imapUser, imapPass, imapSecure } = settings;

    if (!imapHost || !imapUser || !imapPass) {
      throw new BadRequestException(
        'Настройте IMAP в профиле (host, user, password)',
      );
    }

    // Use nodemailer's built-in IMAP support is not available,
    // so we use a simple fetch-based approach with the IMAP protocol
    // For now, use a basic TCP connection approach
    const { ImapFlow } = await this.loadImapFlow();

    const client = new ImapFlow({
      host: imapHost,
      port: imapPort || (imapSecure ? 993 : 143),
      secure: imapSecure ?? true,
      auth: { user: imapUser, pass: imapPass },
      logger: false,
      tls: { rejectUnauthorized: false },
    });

    let fetched = 0;

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      try {
        // Get last 50 messages
        const totalMessages = client.mailbox?.exists || 0;
        if (totalMessages === 0) return { fetched: 0 };

        const startSeq = Math.max(1, totalMessages - 49);

        for await (const msg of client.fetch(`${startSeq}:*`, {
          envelope: true,
          source: true,
        })) {
          const envelope = msg.envelope;
          if (!envelope) continue;

          const messageId = envelope.messageId || null;

          // Check if already stored
          if (messageId) {
            const existing = await this.emailMessageRepository.findOne({
              where: { userId, messageId },
            });
            if (existing) {
              // Re-parse old messages that have no bodyHtml
              if (existing.bodyHtml === null && msg.source) {
                try {
                  const parsed = await simpleParser(msg.source);
                  existing.bodyText = parsed.text || existing.bodyText;
                  existing.bodyHtml = parsed.html || null;
                  await this.emailMessageRepository.save(existing);
                } catch {
                  // ignore re-parse errors
                }
              }
              continue;
            }
          }

          const fromAddr =
            envelope.from?.[0]?.address?.toLowerCase() || 'unknown';
          const subject = envelope.subject || '';

          // Parse the full MIME source to extract text and HTML bodies
          let bodyText = '';
          let bodyHtml: string | null = null;

          if (msg.source) {
            try {
              const parsed = await simpleParser(msg.source);
              bodyText = parsed.text || '';
              bodyHtml = parsed.html || null;
            } catch (parseErr: any) {
              this.logger.warn(`Failed to parse email MIME: ${parseErr.message}`);
              bodyText = msg.source.toString('utf-8');
            }
          }

          const emailMsg = this.emailMessageRepository.create({
            userId,
            direction: 'received',
            contactEmail: fromAddr,
            subject,
            bodyText,
            bodyHtml,
            messageId,
            inReplyTo: envelope.inReplyTo || null,
            isRead: false,
          });

          await this.emailMessageRepository.save(emailMsg);
          fetched++;
        }
      } finally {
        lock.release();
      }

      await client.logout();
    } catch (error: any) {
      this.logger.error(`IMAP fetch failed: ${error.message}`);
      throw new BadRequestException(`Ошибка получения почты: ${error.message}`);
    }

    return { fetched };
  }

  private async loadImapFlow(): Promise<any> {
    try {
      return await import('imapflow');
    } catch {
      throw new BadRequestException(
        'IMAP модуль не установлен. Установите: npm install imapflow',
      );
    }
  }

  // --- Get threads (conversations grouped by contact_email) ---

  async getThreads(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: any[]; total: number }> {
    // Get unique contact emails with latest message info
    const raw = await this.emailMessageRepository
      .createQueryBuilder('m')
      .select('m.contact_email', 'contactEmail')
      .addSelect('COUNT(*)', 'messageCount')
      .addSelect('MAX(m.created_at)', 'lastMessageAt')
      .addSelect(
        'SUM(CASE WHEN m.direction = \'received\' AND m.is_read = false THEN 1 ELSE 0 END)',
        'unreadCount',
      )
      .where('m.user_id = :userId', { userId })
      .groupBy('m.contact_email')
      .orderBy('MAX(m.created_at)', 'DESC')
      .getRawMany();

    const total = raw.length;
    const skip = (page - 1) * limit;
    const paged = raw.slice(skip, skip + limit);

    // Enrich with latest message preview
    const threads = [];
    for (const row of paged) {
      const lastMsg = await this.emailMessageRepository.findOne({
        where: { userId, contactEmail: row.contactEmail },
        order: { createdAt: 'DESC' },
      });

      threads.push({
        contactEmail: row.contactEmail,
        messageCount: parseInt(row.messageCount, 10),
        unreadCount: parseInt(row.unreadCount, 10),
        lastMessageAt: row.lastMessageAt,
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              direction: lastMsg.direction,
              subject: lastMsg.subject,
              preview: lastMsg.bodyText.substring(0, 120),
            }
          : null,
      });
    }

    return { data: threads, total };
  }

  // --- Get messages for a specific thread ---

  async getThread(
    userId: string,
    contactEmail: string,
  ): Promise<EmailMessage[]> {
    // Mark received messages as read
    await this.emailMessageRepository.update(
      { userId, contactEmail, direction: 'received', isRead: false },
      { isRead: true },
    );

    return this.emailMessageRepository.find({
      where: { userId, contactEmail },
      order: { createdAt: 'ASC' },
    });
  }
}
