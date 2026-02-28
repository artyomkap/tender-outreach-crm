import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProzorroTender } from './entities/prozorro-tender.entity';
import { ProzorroTenderDoc } from './entities/prozorro-tender-doc.entity';
import { ProzorroAiResult } from './entities/prozorro-ai-result.entity';
import { ProzorroWebResult } from './entities/prozorro-web-result.entity';
import { ProzorroBlacklist } from './entities/prozorro-blacklist.entity';
import { SearchProzorroDto } from './dto/search-prozorro.dto';

const PROZORRO_API = 'https://public-api.prozorro.gov.ua/api/2.5';

@Injectable()
export class ProzorroService {
  private readonly logger = new Logger(ProzorroService.name);

  constructor(
    @InjectRepository(ProzorroTender)
    private readonly tenderRepo: Repository<ProzorroTender>,
    @InjectRepository(ProzorroTenderDoc)
    private readonly docRepo: Repository<ProzorroTenderDoc>,
    @InjectRepository(ProzorroAiResult)
    private readonly aiResultRepo: Repository<ProzorroAiResult>,
    @InjectRepository(ProzorroWebResult)
    private readonly webResultRepo: Repository<ProzorroWebResult>,
    @InjectRepository(ProzorroBlacklist)
    private readonly blacklistRepo: Repository<ProzorroBlacklist>,
  ) {}

  // ─── Search tenders ────────────────────────────────────────

  async search(
    dto: SearchProzorroDto,
  ): Promise<{ results: ProzorroTender[]; scannedCount: number }> {
    const limit = dto.limit || 20;
    const maxPages = dto.maxPages || 10;
    const query = (dto.query || '').trim().toLowerCase();
    const statusFilter = dto.status || '';

    const results: ProzorroTender[] = [];
    let scannedCount = 0;
    let nextUrl =
      `${PROZORRO_API}/tenders?descending=1&limit=100` +
      `&opt_fields=title,status,value,procuringEntity,tenderPeriod,procurementMethodType`;

    for (let page = 0; page < maxPages && results.length < limit; page++) {
      let data: any;
      try {
        const response = await fetch(nextUrl, {
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) {
          this.logger.error(`Prozorro API returned ${response.status}`);
          break;
        }
        data = await response.json();
      } catch (error: any) {
        this.logger.error(`Prozorro API fetch error: ${error.message}`);
        break;
      }

      if (!data?.data?.length) break;
      scannedCount += data.data.length;

      for (const item of data.data) {
        if (results.length >= limit) break;

        const title = (item.title || '').toLowerCase();
        if (query && !title.includes(query)) continue;
        if (statusFilter && item.status !== statusFilter) continue;

        try {
          const tender = await this.upsertTenderFromFeed(item);
          results.push(tender);
        } catch (error: any) {
          this.logger.error(`Failed to upsert tender ${item.id}: ${error.message}`);
        }
      }

      const nextUri = data.next_page?.uri;
      if (!nextUri) break;
      nextUrl = nextUri;
    }

    return { results, scannedCount };
  }

  private async upsertTenderFromFeed(item: any): Promise<ProzorroTender> {
    const prozorroId = item.id;
    let tender = await this.tenderRepo.findOne({ where: { prozorroId } });

    const fields = {
      prozorroId,
      tenderNumber: item.tenderID || prozorroId,
      title: item.title || '',
      status: item.status || null,
      amount: item.value?.amount ?? null,
      currency: item.value?.currency ?? null,
      procuringEntityName: item.procuringEntity?.name || null,
      procuringEntityId: item.procuringEntity?.identifier?.id || null,
      procurementMethodType: item.procurementMethodType || null,
      tenderPeriodEnd: item.tenderPeriod?.endDate
        ? new Date(item.tenderPeriod.endDate)
        : null,
    };

    if (tender) {
      Object.assign(tender, fields);
      return this.tenderRepo.save(tender);
    }

    tender = this.tenderRepo.create(fields);
    return this.tenderRepo.save(tender);
  }

  // ─── Get tender details ────────────────────────────────────

  async getTender(prozorroId: string): Promise<ProzorroTender> {
    let tender = await this.tenderRepo.findOne({
      where: { prozorroId },
      relations: ['docs'],
    });

    const needsFetch = !tender || !tender.detailFetchedAt;

    if (needsFetch) {
      tender = await this.fetchAndStoreTenderDetail(prozorroId, tender);
    }

    if (!tender) {
      throw new NotFoundException('Тендер не найден');
    }

    return tender;
  }

  private async fetchAndStoreTenderDetail(
    prozorroId: string,
    existing: ProzorroTender | null,
  ): Promise<ProzorroTender> {
    const url = `${PROZORRO_API}/tenders/${prozorroId}`;

    let detailData: any;
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        throw new Error(`Prozorro API returned ${response.status}`);
      }
      detailData = await response.json();
    } catch (error: any) {
      this.logger.error(`Failed to fetch tender ${prozorroId}: ${error.message}`);
      if (existing) return existing;
      throw new BadRequestException(`Ошибка загрузки тендера: ${error.message}`);
    }

    const d = detailData.data;
    if (!d) {
      if (existing) return existing;
      throw new BadRequestException('Пустой ответ от Prozorro API');
    }

    const fields = {
      prozorroId: d.id || prozorroId,
      tenderNumber: d.tenderID || prozorroId,
      title: d.title || '',
      description: d.description || null,
      status: d.status || null,
      amount: d.value?.amount ?? null,
      currency: d.value?.currency ?? null,
      procuringEntityName: d.procuringEntity?.name || null,
      procuringEntityId: d.procuringEntity?.identifier?.id || null,
      procurementMethodType: d.procurementMethodType || null,
      tenderPeriodEnd: d.tenderPeriod?.endDate
        ? new Date(d.tenderPeriod.endDate)
        : null,
      rawData: d,
      detailFetchedAt: new Date(),
    };

    let tender: ProzorroTender;
    if (existing) {
      Object.assign(existing, fields);
      tender = await this.tenderRepo.save(existing);
    } else {
      tender = this.tenderRepo.create(fields);
      tender = await this.tenderRepo.save(tender);
    }

    // Store documents
    if (Array.isArray(d.documents)) {
      for (const doc of d.documents) {
        if (!doc.id) continue;
        const existingDoc = await this.docRepo.findOne({
          where: { tenderId: tender.id, documentId: doc.id },
        });
        if (existingDoc) continue;

        const newDoc = this.docRepo.create({
          tenderId: tender.id,
          documentId: doc.id,
          title: doc.title || 'Без названия',
          format: doc.format || null,
          url: doc.url || '',
          documentType: doc.documentType || null,
        });
        await this.docRepo.save(newDoc);
      }
    }

    return this.tenderRepo.findOne({
      where: { id: tender.id },
      relations: ['docs'],
    }) as Promise<ProzorroTender>;
  }

  // ─── Parse document text ───────────────────────────────────

  async parseDocument(
    docId: string,
    user: { settings?: { parserDocsUrl?: string; proxyUrl?: string } | null },
  ): Promise<ProzorroTenderDoc> {
    const doc = await this.docRepo.findOne({ where: { id: docId } });
    if (!doc) throw new NotFoundException('Документ не найден');

    const parserDocsUrl = user.settings?.parserDocsUrl;
    const proxyUrl = user.settings?.proxyUrl;

    if (!parserDocsUrl || !proxyUrl) {
      throw new BadRequestException('Настройте Parser Docs URL и Proxy URL в профиле');
    }

    const encodedFileUrl = encodeURIComponent(doc.url);
    const proxiedUrl = proxyUrl + encodedFileUrl;
    const finalUrl = parserDocsUrl + encodeURIComponent(proxiedUrl);

    try {
      const response = await fetch(finalUrl, {
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        throw new Error(`Parser API returned status ${response.status}`);
      }
      const data = await response.json();
      doc.parsedText = data.text || null;
      return this.docRepo.save(doc);
    } catch (error: any) {
      this.logger.error(`Failed to parse doc ${docId}: ${error.message}`);
      throw new BadRequestException(`Ошибка парсинга: ${error.message}`);
    }
  }

  // ─── AI analysis ───────────────────────────────────────────

  async prepareTender(
    tenderId: string,
    user: {
      id: string;
      settings?: { aiUrl?: string; aiPrompt?: string } | null;
    },
  ): Promise<ProzorroAiResult> {
    const aiUrl = user.settings?.aiUrl;
    const aiPrompt = user.settings?.aiPrompt;
    if (!aiUrl) throw new BadRequestException('Настройте AI URL в профиле');
    if (!aiPrompt) throw new BadRequestException('Настройте AI промпт в профиле');

    const tender = await this.tenderRepo.findOne({
      where: { id: tenderId },
      relations: ['docs'],
    });
    if (!tender) throw new NotFoundException('Тендер не найден');

    const parsedDocs = (tender.docs || []).filter((d) => d.parsedText);
    const docTexts = parsedDocs
      .map(
        (d, i) =>
          `--- Документ ${i + 1}: ${d.title} ---\n${d.parsedText}`,
      )
      .join('\n\n');

    // Build items description from rawData
    const items = tender.rawData?.items || [];
    const itemsText = items.length
      ? '\nСостав закупки:\n' +
        items
          .map(
            (it: any) =>
              `- ${it.description || '?'} (${it.quantity ?? '?'} ${it.unit?.name || 'шт'})`,
          )
          .join('\n')
      : '';

    const data = [
      aiPrompt,
      `\nНазвание закупки: ${tender.title}`,
      tender.description ? `\nОписание: ${tender.description}` : '',
      itemsText,
      docTexts ? `\n${docTexts}` : '',
    ].join('\n');

    let aiResponse: any;
    try {
      const response = await fetch(aiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: data }),
        signal: AbortSignal.timeout(120000),
      });
      if (!response.ok) {
        throw new Error(`AI API returned status ${response.status}`);
      }
      aiResponse = await response.json();
    } catch (error: any) {
      this.logger.error(`AI API call failed: ${error.message}`);
      throw new BadRequestException(`Ошибка AI API: ${error.message}`);
    }

    let parsed: { search?: string; subject?: string; body?: string };
    try {
      let answerStr = aiResponse.answer || '';
      const jsonMatch = answerStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) answerStr = jsonMatch[1].trim();
      parsed = JSON.parse(answerStr);
    } catch {
      this.logger.error(`Failed to parse AI answer: ${aiResponse.answer}`);
      throw new BadRequestException('AI вернул невалидный JSON');
    }

    // Upsert AI result
    let result = await this.aiResultRepo.findOne({
      where: { userId: user.id, tenderId: tender.id },
    });

    if (result) {
      result.searchQuery = (parsed.search || '').trim() || null;
      result.subject = (parsed.subject || '').trim() || null;
      result.body = (parsed.body || '').trim() || null;
    } else {
      result = this.aiResultRepo.create({
        userId: user.id,
        tenderId: tender.id,
        searchQuery: (parsed.search || '').trim() || null,
        subject: (parsed.subject || '').trim() || null,
        body: (parsed.body || '').trim() || null,
      });
    }

    return this.aiResultRepo.save(result);
  }

  // ─── Web search ────────────────────────────────────────────

  async webSearch(
    searchQuery: string,
    user: { id: string; settings?: { searchApiUrl?: string } | null },
  ): Promise<ProzorroWebResult[]> {
    const searchApiUrl = user.settings?.searchApiUrl;
    if (!searchApiUrl) {
      throw new BadRequestException('Настройте Search API URL в профиле');
    }

    const url = searchApiUrl + encodeURIComponent(searchQuery);

    let apiData: any;
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        throw new Error(`Search API returned status ${response.status}`);
      }
      apiData = await response.json();
      if (!apiData.success || !Array.isArray(apiData.results)) {
        throw new Error('Invalid search API response');
      }
    } catch (error: any) {
      this.logger.error(`Web search failed: ${error.message}`);
      throw new BadRequestException(`Ошибка поиска: ${error.message}`);
    }

    const results: ProzorroWebResult[] = [];

    for (const item of apiData.results) {
      const itemUrl = (item.url || '').trim();
      if (!itemUrl) continue;

      let wsr = await this.webResultRepo.findOne({
        where: { url: itemUrl, userId: user.id },
      });

      if (!wsr) {
        wsr = this.webResultRepo.create({
          userId: user.id,
          searchQuery,
          url: itemUrl,
          title: item.title || '',
          snippet: item.snippet || '',
          favicon: item.favicon || '',
          parsedEmails: [],
        });
        wsr = await this.webResultRepo.save(wsr);
      } else {
        wsr.title = item.title || wsr.title;
        wsr.snippet = item.snippet || wsr.snippet;
        wsr.favicon = item.favicon || wsr.favicon;
        if (wsr.searchQuery !== searchQuery) {
          wsr.searchQuery = searchQuery;
        }
        wsr = await this.webResultRepo.save(wsr);
      }

      results.push(wsr);
    }

    return results;
  }

  // ─── Get web results ───────────────────────────────────────

  async getWebResults(
    userId: string,
    searchQuery: string,
  ): Promise<ProzorroWebResult[]> {
    return this.webResultRepo.find({
      where: { userId, searchQuery },
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Parse emails from site ────────────────────────────────

  async parseEmails(
    webResultId: string,
    userId: string,
  ): Promise<ProzorroWebResult> {
    const wsr = await this.webResultRepo.findOne({
      where: { id: webResultId, userId },
    });
    if (!wsr) throw new NotFoundException('Результат поиска не найден');

    let html: string;
    try {
      const response = await fetch(wsr.url, {
        signal: AbortSignal.timeout(30000),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      if (!response.ok) {
        throw new Error(`Site returned status ${response.status}`);
      }
      html = await response.text();
    } catch (error: any) {
      this.logger.error(`Failed to fetch site ${wsr.url}: ${error.message}`);
      throw new BadRequestException(`Ошибка загрузки сайта: ${error.message}`);
    }

    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    const rawEmails = html.match(emailRegex) || [];
    const unique = [...new Set(rawEmails.map((e) => e.toLowerCase()))];
    const filtered = unique.filter((email) => {
      if (/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/i.test(email)) return false;
      if (email.length > 254) return false;
      return true;
    });

    wsr.parsedEmails = filtered;
    return this.webResultRepo.save(wsr);
  }

  // ─── Outreach (combined data) ──────────────────────────────

  async getOutreach(userId: string): Promise<any[]> {
    const aiResults = await this.aiResultRepo.find({
      where: { userId },
      relations: ['tender'],
      order: { createdAt: 'DESC' },
    });

    const blacklisted = new Set(
      (await this.blacklistRepo.find({ where: { userId } })).map(
        (b) => b.email,
      ),
    );

    const outreach = [];

    for (const ai of aiResults) {
      const webResults = ai.searchQuery
        ? await this.webResultRepo.find({
            where: { userId, searchQuery: ai.searchQuery },
          })
        : [];

      const allEmails: string[] = [];
      for (const wr of webResults) {
        for (const e of wr.parsedEmails || []) {
          if (!allEmails.includes(e) && !blacklisted.has(e)) {
            allEmails.push(e);
          }
        }
      }

      outreach.push({
        id: ai.id,
        searchQuery: ai.searchQuery,
        subject: ai.subject,
        body: ai.body,
        createdAt: ai.createdAt,
        tender: ai.tender
          ? {
              id: ai.tender.id,
              prozorroId: ai.tender.prozorroId,
              tenderNumber: ai.tender.tenderNumber,
              title: ai.tender.title,
            }
          : null,
        webResults: webResults.map((wr) => ({
          id: wr.id,
          url: wr.url,
          title: wr.title,
          snippet: wr.snippet,
          favicon: wr.favicon,
          parsedEmails: (wr.parsedEmails || []).filter(
            (e) => !blacklisted.has(e),
          ),
        })),
        emails: allEmails,
      });
    }

    return outreach;
  }

  // ─── Prepared letters ──────────────────────────────────────

  async getLetters(userId: string): Promise<any[]> {
    const aiResults = await this.aiResultRepo.find({
      where: { userId },
      relations: ['tender'],
      order: { createdAt: 'DESC' },
    });

    const blacklisted = new Set(
      (await this.blacklistRepo.find({ where: { userId } })).map(
        (b) => b.email,
      ),
    );

    const letters = [];

    for (const ai of aiResults) {
      if (!ai.subject || !ai.body || !ai.searchQuery) continue;

      const webResults = await this.webResultRepo.find({
        where: { userId, searchQuery: ai.searchQuery },
      });

      const emails: string[] = [];
      for (const wr of webResults) {
        for (const e of wr.parsedEmails || []) {
          if (!emails.includes(e) && !blacklisted.has(e)) {
            emails.push(e);
          }
        }
      }

      if (emails.length === 0) continue;

      letters.push({
        searchQuery: ai.searchQuery,
        subject: ai.subject,
        body: ai.body,
        tender: ai.tender
          ? {
              id: ai.tender.id,
              tenderNumber: ai.tender.tenderNumber,
              title: ai.tender.title,
            }
          : null,
        emails,
      });
    }

    return letters;
  }

  // ─── Blacklist CRUD ────────────────────────────────────────

  async getBlacklist(userId: string): Promise<ProzorroBlacklist[]> {
    return this.blacklistRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async addBlacklist(userId: string, email: string): Promise<ProzorroBlacklist> {
    const normalized = email.toLowerCase().trim();
    const existing = await this.blacklistRepo.findOne({
      where: { userId, email: normalized },
    });
    if (existing) return existing;

    const entry = this.blacklistRepo.create({ userId, email: normalized });
    return this.blacklistRepo.save(entry);
  }

  async removeBlacklist(userId: string, email: string): Promise<void> {
    await this.blacklistRepo.delete({ userId, email: email.toLowerCase().trim() });
  }
}
