import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Purchase } from './entities/purchase.entity';
import { PurchaseFile } from './entities/purchase-file.entity';
import { UserPurchaseHistory } from './entities/user-purchase-history.entity';
import { SearchQuery } from './entities/search-query.entity';
import { FoundPurchase } from './entities/found-purchase.entity';
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
  ) {}

  async search(
    dto: SearchPurchasesDto,
    userId: string,
  ): Promise<{ results: Purchase[]; debugUrl: string; searchQueryId: string }> {
    // Build params only with explicitly provided values
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

    // Save search query
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

        // Fetch detail if not yet fetched
        if (!purchase.detailFetchedAt) {
          await this.fetchAndStoreDetail(purchase);
        }

        // Reload with files
        purchase = await this.purchaseRepository.findOne({
          where: { id: purchase.id },
          relations: ['files'],
        });

        if (purchase) {
          results.push(purchase);

          // Record in user_purchase_history
          const historyEntry = this.historyRepository.create({
            userId,
            purchaseId: purchase.id,
            searchQuery: dto.objectInfo || null,
          });
          await this.historyRepository.save(historyEntry);

          // Upsert found_purchase (user + purchase unique)
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

    // Update results count
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
  ): Promise<{ data: FoundPurchase[]; total: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.foundPurchaseRepository.findAndCount({
      where: { userId },
      relations: ['purchase', 'purchase.files'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total };
  }

  // --- Favorites ---

  async getFavorites(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: FoundPurchase[]; total: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.foundPurchaseRepository.findAndCount({
      where: { userId, isFavorite: true },
      relations: ['purchase', 'purchase.files'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total };
  }

  async toggleFavorite(
    userId: string,
    purchaseId: string,
  ): Promise<{ isFavorite: boolean }> {
    let foundPurchase = await this.foundPurchaseRepository.findOne({
      where: { userId, purchaseId },
    });

    if (!foundPurchase) {
      // Auto-create if user tries to favorite a purchase they haven't found yet
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

  // --- View history (existing) ---

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
}
