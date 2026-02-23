import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Purchase } from './entities/purchase.entity';
import { PurchaseFile } from './entities/purchase-file.entity';
import { UserPurchaseHistory } from './entities/user-purchase-history.entity';
import { SearchQuery } from './entities/search-query.entity';
import { FoundPurchase } from './entities/found-purchase.entity';
import { PurchaseAiResult } from './entities/purchase-ai-result.entity';
import { AiSearchTerm } from './entities/ai-search-term.entity';
import { AiSearchTermPurchase } from './entities/ai-search-term-purchase.entity';
import { WebSearchResult } from './entities/web-search-result.entity';
import { WebSearchResultSearchTerm } from './entities/web-search-result-search-term.entity';
import { WebSearchResultEmail } from './entities/web-search-result-email.entity';
import { ParsedEmail } from './entities/parsed-email.entity';
import { SearchPurchasesDto } from './dto/search-purchases.dto';

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
    @InjectRepository(PurchaseFile)
    private readonly purchaseFileRepository: Repository<PurchaseFile>,
    @InjectRepository(UserPurchaseHistory)
    private readonly historyRepository: Repository<UserPurchaseHistory>,
    @InjectRepository(SearchQuery)
    private readonly searchQueryRepository: Repository<SearchQuery>,
    @InjectRepository(FoundPurchase)
    private readonly foundPurchaseRepository: Repository<FoundPurchase>,
    @InjectRepository(PurchaseAiResult)
    private readonly aiResultRepository: Repository<PurchaseAiResult>,
    @InjectRepository(AiSearchTerm)
    private readonly aiSearchTermRepository: Repository<AiSearchTerm>,
    @InjectRepository(AiSearchTermPurchase)
    private readonly aiSearchTermPurchaseRepository: Repository<AiSearchTermPurchase>,
    @InjectRepository(WebSearchResult)
    private readonly webSearchResultRepository: Repository<WebSearchResult>,
    @InjectRepository(WebSearchResultSearchTerm)
    private readonly webSearchResultSearchTermRepository: Repository<WebSearchResultSearchTerm>,
    @InjectRepository(WebSearchResultEmail)
    private readonly webSearchResultEmailRepository: Repository<WebSearchResultEmail>,
    @InjectRepository(ParsedEmail)
    private readonly parsedEmailRepository: Repository<ParsedEmail>,
  ) {}

  async search(
    dto: SearchPurchasesDto,
    userId: string,
  ): Promise<{ results: Purchase[]; debugUrl: string; searchQueryId: string }> {
    const params = new URLSearchParams();

    params.set('limit', String(dto.limit ?? 10));
    params.set('skip', String(dto.skip ?? 0));
    params.set('sort', 'updated_at_desc');

    if (dto.stage != null) {
      params.set('stage', String(dto.stage));
    }

    if (dto.region != null) {
      params.set('region', String(dto.region));
    }

    if (dto.publishedAfter) {
      params.set('published_after', dto.publishedAfter);
    }

    if (dto.publishedBefore) {
      params.set('published_before', dto.publishedBefore);
    }

    if (dto.priceGe != null) {
      params.set('price_ge', String(dto.priceGe));
    }

    if (dto.priceLe != null) {
      params.set('price_le', String(dto.priceLe));
    }

    if (dto.objectInfo) {
      params.set('object_info', dto.objectInfo);
    }

    const url = `https://v2.gosplan.info/fz44/purchases?${params.toString()}`;
    this.logger.debug(`Search URL: ${url}`);

    const searchQuery = this.searchQueryRepository.create({
      userId,
      queryParams: dto as unknown as Record<string, unknown>,
      resultsCount: 0,
    });
    const savedSearchQuery = await this.searchQueryRepository.save(searchQuery);

    let listData: any[];
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        this.logger.error(`Search API returned status ${response.status}`);
        return { results: [], debugUrl: url, searchQueryId: savedSearchQuery.id };
      }
      listData = await response.json();
    } catch (error) {
      this.logger.error(`Failed to fetch from search API: ${error.message}`);
      return { results: [], debugUrl: url, searchQueryId: savedSearchQuery.id };
    }

    if (!Array.isArray(listData)) {
      this.logger.error('Search API returned non-array response');
      return { results: [], debugUrl: url, searchQueryId: savedSearchQuery.id };
    }

    const results: Purchase[] = [];

    for (const item of listData) {
      try {
        const purchaseNumber = item.purchase_number;
        if (!purchaseNumber) continue;

        let purchase = await this.purchaseRepository.findOne({
          where: { purchaseNumber },
          relations: ['files'],
        });

        if (!purchase) {
          purchase = this.purchaseRepository.create({
            purchaseNumber,
            objectInfo: item.object_info || null,
            maxPrice: item.max_price ?? null,
            currencyCode: item.currency_code || null,
            purchaseType: item.purchase_type || null,
            stage: item.stage ?? null,
            region: item.region ?? null,
            publishedAt: item.published_at ? new Date(item.published_at) : null,
            updatedAtExternal: item.updated_at ? new Date(item.updated_at) : null,
            customers: item.customers || null,
            owners: item.owners || null,
            rawListData: item,
          });
          purchase = await this.purchaseRepository.save(purchase);
        } else if (!purchase.detailFetchedAt) {
          purchase.objectInfo = item.object_info || purchase.objectInfo;
          purchase.maxPrice = item.max_price ?? purchase.maxPrice;
          purchase.currencyCode = item.currency_code || purchase.currencyCode;
          purchase.purchaseType = item.purchase_type || purchase.purchaseType;
          purchase.stage = item.stage ?? purchase.stage;
          purchase.region = item.region ?? purchase.region;
          purchase.publishedAt = item.published_at ? new Date(item.published_at) : purchase.publishedAt;
          purchase.updatedAtExternal = item.updated_at ? new Date(item.updated_at) : purchase.updatedAtExternal;
          purchase.customers = item.customers || purchase.customers;
          purchase.owners = item.owners || purchase.owners;
          purchase.rawListData = item;
          purchase = await this.purchaseRepository.save(purchase);
        }

        if (!purchase.detailFetchedAt) {
          await this.fetchAndStoreDetail(purchase);
        }

        purchase = await this.purchaseRepository.findOne({
          where: { id: purchase.id },
          relations: ['files'],
        });

        if (purchase) {
          results.push(purchase);

          const historyEntry = this.historyRepository.create({
            userId,
            purchaseId: purchase.id,
            searchQuery: dto.objectInfo || null,
          });
          await this.historyRepository.save(historyEntry);

          const existing = await this.foundPurchaseRepository.findOne({
            where: { userId, purchaseId: purchase.id },
          });
          if (!existing) {
            const foundPurchase = this.foundPurchaseRepository.create({
              userId,
              purchaseId: purchase.id,
              searchQueryId: savedSearchQuery.id,
              isFavorite: false,
            });
            await this.foundPurchaseRepository.save(foundPurchase);
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to process purchase ${item.purchase_number}: ${error.message}`,
        );
      }
    }

    savedSearchQuery.resultsCount = results.length;
    await this.searchQueryRepository.save(savedSearchQuery);

    return { results, debugUrl: url, searchQueryId: savedSearchQuery.id };
  }

  // --- Search queries history ---

  async getSearchQueries(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: SearchQuery[]; total: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.searchQueryRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total };
  }

  // --- Found purchases ---

  async getFoundPurchases(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: any[]; total: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.foundPurchaseRepository.findAndCount({
      where: { userId },
      relations: ['purchase', 'purchase.files'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data: await this.enrichWithAiStatus(data, userId), total };
  }

  // --- Favorites ---

  async getFavorites(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: any[]; total: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.foundPurchaseRepository.findAndCount({
      where: { userId, isFavorite: true },
      relations: ['purchase', 'purchase.files'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data: await this.enrichWithAiStatus(data, userId), total };
  }

  private async enrichWithAiStatus(
    items: FoundPurchase[],
    userId: string,
  ): Promise<any[]> {
    if (items.length === 0) return items;

    const purchaseIds = items.map((i) => i.purchaseId);
    const aiResults = await this.aiResultRepository.find({
      where: purchaseIds.map((pid) => ({ userId, purchaseId: pid })),
      relations: ['searchTerm'],
    });

    const aiMap = new Map(aiResults.map((r) => [r.purchaseId, r]));

    const enriched: any[] = [];
    for (const item of items) {
      const ai = aiMap.get(item.purchaseId);
      const savedDocsCount = item.purchase?.files?.filter((f) => f.parsedText)?.length || 0;
      const totalDocsCount = item.purchase?.files?.length || 0;

      let sitesCount = 0;
      let emailsCount = 0;

      if (ai?.searchTerm) {
        const wsrtLinks = await this.webSearchResultSearchTermRepository.find({
          where: { searchTermId: ai.searchTerm.id },
          relations: ['webSearchResult', 'webSearchResult.emailLinks', 'webSearchResult.emailLinks.parsedEmail'],
        });

        const userLinks = wsrtLinks.filter(
          (l) => l.webSearchResult && l.webSearchResult.userId === userId,
        );
        sitesCount = userLinks.length;

        const emailsSet = new Set<string>();
        for (const l of userLinks) {
          for (const el of (l.webSearchResult.emailLinks || [])) {
            if (el.parsedEmail) emailsSet.add(el.parsedEmail.email);
          }
        }
        emailsCount = emailsSet.size;
      }

      enriched.push({
        ...item,
        aiResult: ai ? { id: ai.id, subject: ai.subject, body: ai.body, searchTerm: ai.searchTerm } : null,
        savedDocsCount,
        totalDocsCount,
        sitesCount,
        emailsCount,
      });
    }

    return enriched;
  }

  async toggleFavorite(
    userId: string,
    purchaseId: string,
  ): Promise<{ isFavorite: boolean }> {
    let foundPurchase = await this.foundPurchaseRepository.findOne({
      where: { userId, purchaseId },
    });

    if (!foundPurchase) {
      foundPurchase = this.foundPurchaseRepository.create({
        userId,
        purchaseId,
        isFavorite: true,
      });
      await this.foundPurchaseRepository.save(foundPurchase);
      return { isFavorite: true };
    }

    foundPurchase.isFavorite = !foundPurchase.isFavorite;
    await this.foundPurchaseRepository.save(foundPurchase);
    return { isFavorite: foundPurchase.isFavorite };
  }

  // --- View history ---

  async getHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: UserPurchaseHistory[]; total: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.historyRepository.findAndCount({
      where: { userId },
      relations: ['purchase', 'purchase.files'],
      order: { foundAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total };
  }

  async getById(purchaseNumber: string): Promise<Purchase | null> {
    let purchase = await this.purchaseRepository.findOne({
      where: { purchaseNumber },
      relations: ['files'],
    });

    if (!purchase) {
      return null;
    }

    if (!purchase.detailFetchedAt) {
      await this.fetchAndStoreDetail(purchase);
      purchase = await this.purchaseRepository.findOne({
        where: { id: purchase.id },
        relations: ['files'],
      });
    }

    return purchase;
  }

  private async fetchAndStoreDetail(purchase: Purchase): Promise<void> {
    const detailUrl = `https://v2test.gosplan.info/fz44/purchases/${purchase.purchaseNumber}`;

    try {
      const response = await fetch(detailUrl, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        this.logger.error(
          `Detail API returned status ${response.status} for ${purchase.purchaseNumber}`,
        );
        return;
      }

      const detailData = await response.json();

      purchase.rawDetailData = detailData;
      purchase.detailFetchedAt = new Date();
      await this.purchaseRepository.save(purchase);

      await this.extractFiles(detailData, purchase.id);
    } catch (error) {
      this.logger.error(
        `Failed to fetch detail for ${purchase.purchaseNumber}: ${error.message}`,
      );
    }
  }

  private async extractFiles(
    detailData: any,
    purchaseId: string,
  ): Promise<void> {
    if (!detailData || !Array.isArray(detailData.docs)) {
      return;
    }

    for (const doc of detailData.docs) {
      try {
        const docType = doc.type || null;
        const source = doc.source;
        if (!source) continue;

        const attachmentsInfo = source.attachmentsInfo;
        if (!attachmentsInfo) continue;

        let attachments = attachmentsInfo.attachmentInfo;
        if (!attachments) continue;

        if (!Array.isArray(attachments)) {
          attachments = [attachments];
        }

        for (const attachment of attachments) {
          const publishedContentId = attachment.publishedContentId;
          if (!publishedContentId) continue;

          const existing = await this.purchaseFileRepository.findOne({
            where: {
              purchaseId,
              publishedContentId: String(publishedContentId),
            },
          });

          if (existing) continue;

          const file = this.purchaseFileRepository.create({
            purchaseId,
            publishedContentId: String(publishedContentId),
            fileName: attachment.fileName || null,
            fileSize: attachment.fileSize ? Number(attachment.fileSize) : null,
            docDescription: attachment.docDescription || null,
            docDate: attachment.docDate ? new Date(attachment.docDate) : null,
            url: attachment.url || '',
            docKindCode: attachment.docKindInfo?.code || null,
            docKindName: attachment.docKindInfo?.name || null,
            docType,
            isDownloaded: false,
            localPath: null,
          });

          await this.purchaseFileRepository.save(file);
        }
      } catch (error) {
        this.logger.error(
          `Failed to extract files for purchase ${purchaseId}: ${error.message}`,
        );
      }
    }
  }

  async parseAndSaveFileText(
    fileId: string,
    user: { settings?: { parserDocsUrl?: string; proxyUrl?: string } | null },
  ): Promise<PurchaseFile> {
    const file = await this.purchaseFileRepository.findOne({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('Файл не найден');
    }

    const parserDocsUrl = user.settings?.parserDocsUrl;
    const proxyUrl = user.settings?.proxyUrl;

    if (!parserDocsUrl || !proxyUrl) {
      throw new BadRequestException('Настройте Parser Docs URL и Proxy URL в профиле');
    }

    const encodedFileUrl = encodeURIComponent(file.url);
    const proxiedUrl = proxyUrl + encodedFileUrl;
    const encodedProxiedUrl = encodeURIComponent(proxiedUrl);
    const finalUrl = parserDocsUrl + encodedProxiedUrl;

    try {
      const response = await fetch(finalUrl, {
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`Parser API returned status ${response.status}`);
      }

      const data = await response.json();
      file.parsedText = data.text || null;
      await this.purchaseFileRepository.save(file);

      return file;
    } catch (error) {
      this.logger.error(`Failed to parse file ${fileId}: ${error.message}`);
      throw new BadRequestException(`Ошибка парсинга документа: ${error.message}`);
    }
  }

  async getFileText(fileId: string): Promise<{ text: string | null }> {
    const file = await this.purchaseFileRepository.findOne({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('Файл не найден');
    }

    return { text: file.parsedText };
  }

  async preparePurchase(
    purchaseId: string,
    user: {
      id: string;
      settings?: {
        aiUrl?: string;
        aiPrompt?: string;
      } | null;
    },
  ): Promise<PurchaseAiResult> {
    const aiUrl = user.settings?.aiUrl;
    const aiPrompt = user.settings?.aiPrompt;

    if (!aiUrl) {
      throw new BadRequestException('Настройте AI URL в профиле');
    }
    if (!aiPrompt) {
      throw new BadRequestException('Настройте AI промпт в профиле');
    }

    const purchase = await this.purchaseRepository.findOne({
      where: { id: purchaseId },
      relations: ['files'],
    });

    if (!purchase) {
      throw new NotFoundException('Закупка не найдена');
    }

    const savedFiles = (purchase.files || []).filter((f) => f.parsedText);
    const docTexts = savedFiles
      .map((f, i) => `--- Документ ${i + 1}: ${f.fileName || f.docDescription || 'Без названия'} ---\n${f.parsedText}`)
      .join('\n\n');

    const data = [
      aiPrompt,
      `\nНазвание закупки: ${purchase.objectInfo || purchase.purchaseNumber}`,
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
    } catch (error) {
      this.logger.error(`Failed to call AI API: ${error.message}`);
      throw new BadRequestException(`Ошибка AI API: ${error.message}`);
    }

    let parsed: { search?: string; subject?: string; body?: string };
    try {
      let answerStr = aiResponse.answer || '';
      const jsonMatch = answerStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        answerStr = jsonMatch[1].trim();
      }
      parsed = JSON.parse(answerStr);
    } catch {
      this.logger.error(`Failed to parse AI answer: ${aiResponse.answer}`);
      throw new BadRequestException('AI вернул невалидный JSON');
    }

    const searchText = (parsed.search || '').trim();
    const subject = (parsed.subject || '').trim() || null;
    const body = (parsed.body || '').trim() || null;

    let searchTerm: AiSearchTerm | null = null;
    if (searchText) {
      searchTerm = await this.aiSearchTermRepository.findOne({
        where: { term: searchText },
      });
      if (!searchTerm) {
        searchTerm = this.aiSearchTermRepository.create({ term: searchText });
        searchTerm = await this.aiSearchTermRepository.save(searchTerm);
      }

      const existingJunction = await this.aiSearchTermPurchaseRepository.findOne({
        where: {
          searchTermId: searchTerm.id,
          purchaseId: purchase.id,
          userId: user.id,
        },
      });
      if (!existingJunction) {
        const junction = this.aiSearchTermPurchaseRepository.create({
          searchTermId: searchTerm.id,
          purchaseId: purchase.id,
          userId: user.id,
        });
        await this.aiSearchTermPurchaseRepository.save(junction);
      }
    }

    let aiResult = await this.aiResultRepository.findOne({
      where: { userId: user.id, purchaseId: purchase.id },
      relations: ['searchTerm'],
    });

    if (aiResult) {
      aiResult.subject = subject;
      aiResult.body = body;
      aiResult.searchTermId = searchTerm?.id || null;
    } else {
      aiResult = this.aiResultRepository.create({
        userId: user.id,
        purchaseId: purchase.id,
        subject,
        body,
        searchTermId: searchTerm?.id || null,
      });
    }

    aiResult = await this.aiResultRepository.save(aiResult);

    const reloaded = await this.aiResultRepository.findOne({
      where: { id: aiResult.id },
      relations: ['searchTerm'],
    });

    return reloaded!;
  }

  async getAiResult(
    purchaseId: string,
    userId: string,
  ): Promise<PurchaseAiResult | null> {
    return this.aiResultRepository.findOne({
      where: { userId, purchaseId },
      relations: ['searchTerm'],
    });
  }

  // --- AI results list for user ---

  async getUserAiResults(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: PurchaseAiResult[]; total: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.aiResultRepository.findAndCount({
      where: { userId },
      relations: ['searchTerm', 'purchase'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total };
  }

  // --- Search terms list for user ---

  async getUserSearchTerms(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: any[]; total: number }> {
    const allJunctions = await this.aiSearchTermPurchaseRepository.find({
      where: { userId },
      relations: ['searchTerm', 'purchase'],
      order: { createdAt: 'DESC' },
    });

    const termMap = new Map<string, { term: AiSearchTerm; purchases: Purchase[] }>();
    for (const j of allJunctions) {
      if (!j.searchTerm) continue;
      if (!termMap.has(j.searchTerm.id)) {
        termMap.set(j.searchTerm.id, { term: j.searchTerm, purchases: [] });
      }
      if (j.purchase) {
        termMap.get(j.searchTerm.id)!.purchases.push(j.purchase);
      }
    }

    const allTerms = Array.from(termMap.values());
    const total = allTerms.length;
    const skip = (page - 1) * limit;
    const paged = allTerms.slice(skip, skip + limit);

    // Enrich with web search results + emails per term
    const enriched = [];
    for (const t of paged) {
      const wsrtLinks = await this.webSearchResultSearchTermRepository.find({
        where: { searchTermId: t.term.id },
        relations: ['webSearchResult', 'webSearchResult.emailLinks', 'webSearchResult.emailLinks.parsedEmail'],
      });

      const sites = wsrtLinks
        .filter((l) => l.webSearchResult && l.webSearchResult.userId === userId)
        .map((l) => {
          const emails = (l.webSearchResult.emailLinks || [])
            .filter((el) => el.parsedEmail)
            .map((el) => el.parsedEmail.email);
          return {
            id: l.webSearchResult.id,
            url: l.webSearchResult.url,
            title: l.webSearchResult.title,
            snippet: l.webSearchResult.snippet,
            favicon: l.webSearchResult.favicon,
            emails,
          };
        });

      enriched.push({
        ...t.term,
        purchases: t.purchases,
        sites,
      });
    }

    return { data: enriched, total };
  }

  // --- Execute web search (with dedup) ---

  async executeWebSearch(
    searchTermId: string,
    user: { id: string; settings?: { searchApiUrl?: string } | null },
  ): Promise<any[]> {
    const searchApiUrl = user.settings?.searchApiUrl;
    if (!searchApiUrl) {
      throw new BadRequestException('Настройте Search API URL в профиле');
    }

    const term = await this.aiSearchTermRepository.findOne({
      where: { id: searchTermId },
    });
    if (!term) {
      throw new NotFoundException('Поисковый запрос не найден');
    }

    const url = searchApiUrl + encodeURIComponent(term.term);

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`Search API returned status ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !Array.isArray(data.results)) {
        throw new Error('Invalid search API response');
      }

      const results: any[] = [];
      for (const item of data.results) {
        const itemUrl = (item.url || '').trim();
        if (!itemUrl) continue;

        // Upsert WebSearchResult by (url, userId)
        let wsr = await this.webSearchResultRepository.findOne({
          where: { url: itemUrl, userId: user.id },
        });

        if (!wsr) {
          wsr = this.webSearchResultRepository.create({
            userId: user.id,
            url: itemUrl,
            title: item.title || '',
            snippet: item.snippet || '',
            favicon: item.favicon || '',
          });
          wsr = await this.webSearchResultRepository.save(wsr);
        } else {
          wsr.title = item.title || wsr.title;
          wsr.snippet = item.snippet || wsr.snippet;
          wsr.favicon = item.favicon || wsr.favicon;
          wsr = await this.webSearchResultRepository.save(wsr);
        }

        // Upsert junction to search term
        const existingLink = await this.webSearchResultSearchTermRepository.findOne({
          where: { webSearchResultId: wsr.id, searchTermId: term.id },
        });
        if (!existingLink) {
          const link = this.webSearchResultSearchTermRepository.create({
            webSearchResultId: wsr.id,
            searchTermId: term.id,
          });
          await this.webSearchResultSearchTermRepository.save(link);
        }

        // Load emails for this result
        const emailLinks = await this.webSearchResultEmailRepository.find({
          where: { webSearchResultId: wsr.id },
          relations: ['parsedEmail'],
        });
        const emails = emailLinks
          .filter((el) => el.parsedEmail)
          .map((el) => el.parsedEmail.email);

        results.push({
          id: wsr.id,
          url: wsr.url,
          title: wsr.title,
          snippet: wsr.snippet,
          favicon: wsr.favicon,
          emails,
        });
      }

      return results;
    } catch (error) {
      this.logger.error(`Web search failed: ${error.message}`);
      throw new BadRequestException(`Ошибка поиска: ${error.message}`);
    }
  }

  // --- Get search results for a term ---

  async getWebSearchResults(
    searchTermId: string,
    userId: string,
  ): Promise<any[]> {
    const links = await this.webSearchResultSearchTermRepository.find({
      where: { searchTermId },
      relations: ['webSearchResult', 'webSearchResult.emailLinks', 'webSearchResult.emailLinks.parsedEmail'],
      order: { createdAt: 'ASC' },
    });

    return links
      .filter((l) => l.webSearchResult && l.webSearchResult.userId === userId)
      .map((l) => {
        const emails = (l.webSearchResult.emailLinks || [])
          .filter((el) => el.parsedEmail)
          .map((el) => el.parsedEmail.email);
        return {
          id: l.webSearchResult.id,
          url: l.webSearchResult.url,
          title: l.webSearchResult.title,
          snippet: l.webSearchResult.snippet,
          favicon: l.webSearchResult.favicon,
          emails,
        };
      });
  }

  // --- Parse emails from a website ---

  async parseEmailsFromSite(
    webSearchResultId: string,
    userId: string,
  ): Promise<{ emails: string[] }> {
    const wsr = await this.webSearchResultRepository.findOne({
      where: { id: webSearchResultId, userId },
    });

    if (!wsr) {
      throw new NotFoundException('Результат поиска не найден');
    }

    let html: string;
    try {
      const response = await fetch(wsr.url, {
        signal: AbortSignal.timeout(30000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`Site returned status ${response.status}`);
      }

      html = await response.text();
    } catch (error) {
      this.logger.error(`Failed to fetch site ${wsr.url}: ${error.message}`);
      throw new BadRequestException(`Ошибка загрузки сайта: ${error.message}`);
    }

    // Extract emails via regex
    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    const rawEmails = html.match(emailRegex) || [];

    // Normalize: lowercase, deduplicate
    const uniqueEmails = [...new Set(rawEmails.map((e) => e.toLowerCase()))];

    // Filter out false positives
    const filteredEmails = uniqueEmails.filter((email) => {
      if (/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/i.test(email)) return false;
      if (email.length > 254) return false;
      return true;
    });

    const savedEmails: string[] = [];

    for (const emailStr of filteredEmails) {
      // Upsert ParsedEmail
      let parsedEmail = await this.parsedEmailRepository.findOne({
        where: { email: emailStr },
      });
      if (!parsedEmail) {
        parsedEmail = this.parsedEmailRepository.create({ email: emailStr });
        parsedEmail = await this.parsedEmailRepository.save(parsedEmail);
      }

      // Upsert junction
      const existingLink = await this.webSearchResultEmailRepository.findOne({
        where: { webSearchResultId: wsr.id, parsedEmailId: parsedEmail.id },
      });
      if (!existingLink) {
        const link = this.webSearchResultEmailRepository.create({
          webSearchResultId: wsr.id,
          parsedEmailId: parsedEmail.id,
        });
        await this.webSearchResultEmailRepository.save(link);
      }

      savedEmails.push(emailStr);
    }

    return { emails: savedEmails };
  }

  // --- Get all parsed emails for user ---

  async getUserEmails(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: any[]; total: number }> {
    const wsrWithEmails = await this.webSearchResultRepository.find({
      where: { userId },
      relations: [
        'emailLinks',
        'emailLinks.parsedEmail',
        'searchTermLinks',
        'searchTermLinks.searchTerm',
      ],
    });

    // Build map: email -> { sites, searchTerms }
    const emailMap = new Map<string, {
      email: string;
      emailId: string;
      sites: { id: string; url: string; title: string }[];
      searchTerms: { id: string; term: string }[];
    }>();

    for (const wsr of wsrWithEmails) {
      const wsrSearchTerms = (wsr.searchTermLinks || [])
        .filter((l) => l.searchTerm)
        .map((l) => ({ id: l.searchTerm.id, term: l.searchTerm.term }));

      for (const el of (wsr.emailLinks || [])) {
        if (!el.parsedEmail) continue;
        const email = el.parsedEmail.email;

        if (!emailMap.has(email)) {
          emailMap.set(email, {
            email,
            emailId: el.parsedEmail.id,
            sites: [],
            searchTerms: [],
          });
        }

        const entry = emailMap.get(email)!;

        if (!entry.sites.find((s) => s.id === wsr.id)) {
          entry.sites.push({ id: wsr.id, url: wsr.url, title: wsr.title });
        }

        for (const st of wsrSearchTerms) {
          if (!entry.searchTerms.find((t) => t.id === st.id)) {
            entry.searchTerms.push(st);
          }
        }
      }
    }

    const allEmails = Array.from(emailMap.values());
    allEmails.sort((a, b) => a.email.localeCompare(b.email));
    const total = allEmails.length;
    const skip = (page - 1) * limit;
    const paged = allEmails.slice(skip, skip + limit);

    return { data: paged, total };
  }

  // --- Get prepared letters with target emails ---

  async getPreparedLetters(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: any[]; total: number }> {
    const aiResults = await this.aiResultRepository.find({
      where: { userId },
      relations: ['purchase', 'searchTerm'],
      order: { createdAt: 'DESC' },
    });

    const letters: any[] = [];

    for (const aiResult of aiResults) {
      if (!aiResult.searchTerm) {
        letters.push({
          id: aiResult.id,
          subject: aiResult.subject,
          body: aiResult.body,
          purchase: aiResult.purchase ? {
            id: aiResult.purchase.id,
            purchaseNumber: aiResult.purchase.purchaseNumber,
            objectInfo: aiResult.purchase.objectInfo,
          } : null,
          searchTerm: null,
          emails: [],
          createdAt: aiResult.createdAt,
        });
        continue;
      }

      // Trace: searchTerm -> webSearchResults -> emails
      const wsrtLinks = await this.webSearchResultSearchTermRepository.find({
        where: { searchTermId: aiResult.searchTerm.id },
        relations: ['webSearchResult', 'webSearchResult.emailLinks', 'webSearchResult.emailLinks.parsedEmail'],
      });

      const emailsSet = new Set<string>();
      for (const l of wsrtLinks) {
        if (!l.webSearchResult || l.webSearchResult.userId !== userId) continue;
        for (const el of (l.webSearchResult.emailLinks || [])) {
          if (el.parsedEmail) {
            emailsSet.add(el.parsedEmail.email);
          }
        }
      }

      letters.push({
        id: aiResult.id,
        subject: aiResult.subject,
        body: aiResult.body,
        purchase: aiResult.purchase ? {
          id: aiResult.purchase.id,
          purchaseNumber: aiResult.purchase.purchaseNumber,
          objectInfo: aiResult.purchase.objectInfo,
        } : null,
        searchTerm: {
          id: aiResult.searchTerm.id,
          term: aiResult.searchTerm.term,
        },
        emails: Array.from(emailsSet).sort(),
        createdAt: aiResult.createdAt,
      });
    }

    const total = letters.length;
    const skip = (page - 1) * limit;
    const paged = letters.slice(skip, skip + limit);

    return { data: paged, total };
  }

  // --- Pipeline detail for a purchase (for modal) ---

  async getPurchasePipelineDetail(
    purchaseId: string,
    userId: string,
  ): Promise<any> {
    const purchase = await this.purchaseRepository.findOne({
      where: { id: purchaseId },
      relations: ['files'],
    });

    if (!purchase) {
      throw new NotFoundException('Закупка не найдена');
    }

    const files = (purchase.files || []).map((f) => ({
      id: f.id,
      fileName: f.fileName,
      docDescription: f.docDescription,
      parsed: !!f.parsedText,
    }));

    const aiResult = await this.aiResultRepository.findOne({
      where: { userId, purchaseId },
      relations: ['searchTerm'],
    });

    let sites: any[] = [];
    let emails: string[] = [];

    if (aiResult?.searchTerm) {
      const wsrtLinks = await this.webSearchResultSearchTermRepository.find({
        where: { searchTermId: aiResult.searchTerm.id },
        relations: ['webSearchResult', 'webSearchResult.emailLinks', 'webSearchResult.emailLinks.parsedEmail'],
      });

      const userLinks = wsrtLinks.filter(
        (l) => l.webSearchResult && l.webSearchResult.userId === userId,
      );

      const emailsSet = new Set<string>();
      sites = userLinks.map((l) => {
        const siteEmails = (l.webSearchResult.emailLinks || [])
          .filter((el) => el.parsedEmail)
          .map((el) => el.parsedEmail.email);
        siteEmails.forEach((e) => emailsSet.add(e));
        return {
          id: l.webSearchResult.id,
          url: l.webSearchResult.url,
          title: l.webSearchResult.title,
          emailsCount: siteEmails.length,
        };
      });
      emails = Array.from(emailsSet).sort();
    }

    return {
      purchaseId: purchase.id,
      purchaseNumber: purchase.purchaseNumber,
      docs: {
        parsed: files.filter((f) => f.parsed).length,
        total: files.length,
        files,
      },
      ai: aiResult
        ? {
            done: true,
            searchTerm: aiResult.searchTerm?.term || null,
            subject: aiResult.subject,
            body: aiResult.body,
          }
        : { done: false, searchTerm: null, subject: null, body: null },
      sites: {
        count: sites.length,
        items: sites,
      },
      emails: {
        count: emails.length,
        items: emails,
      },
      letters: {
        ready: !!(aiResult?.subject && emails.length > 0),
        emailsCount: emails.length,
      },
    };
  }

  // --- Batch pipeline counts for multiple purchases ---

  async getBatchPipelineCounts(
    purchaseIds: string[],
    userId: string,
  ): Promise<Record<string, any>> {
    if (purchaseIds.length === 0) return {};

    const aiResults = await this.aiResultRepository.find({
      where: purchaseIds.map((pid) => ({ userId, purchaseId: pid })),
      relations: ['searchTerm'],
    });
    const aiMap = new Map(aiResults.map((r) => [r.purchaseId, r]));

    const purchases = await this.purchaseRepository.find({
      where: purchaseIds.map((id) => ({ id })),
      relations: ['files'],
    });
    const purchaseMap = new Map(purchases.map((p) => [p.id, p]));

    const result: Record<string, any> = {};

    for (const pid of purchaseIds) {
      const purchase = purchaseMap.get(pid);
      const ai = aiMap.get(pid);
      const files = purchase?.files || [];
      const savedDocsCount = files.filter((f) => f.parsedText).length;
      const totalDocsCount = files.length;

      let sitesCount = 0;
      let emailsCount = 0;

      if (ai?.searchTerm) {
        const wsrtLinks = await this.webSearchResultSearchTermRepository.find({
          where: { searchTermId: ai.searchTerm.id },
          relations: ['webSearchResult', 'webSearchResult.emailLinks', 'webSearchResult.emailLinks.parsedEmail'],
        });

        const userLinks = wsrtLinks.filter(
          (l) => l.webSearchResult && l.webSearchResult.userId === userId,
        );
        sitesCount = userLinks.length;

        const emailsSet = new Set<string>();
        for (const l of userLinks) {
          for (const el of (l.webSearchResult.emailLinks || [])) {
            if (el.parsedEmail) emailsSet.add(el.parsedEmail.email);
          }
        }
        emailsCount = emailsSet.size;
      }

      result[pid] = {
        savedDocsCount,
        totalDocsCount,
        aiResult: ai ? { id: ai.id, subject: ai.subject, body: ai.body, searchTerm: ai.searchTerm ? { id: ai.searchTerm.id, term: ai.searchTerm.term } : null } : null,
        sitesCount,
        emailsCount,
      };
    }

    return result;
  }
}
