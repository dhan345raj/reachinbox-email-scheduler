import { esClient, EMAIL_INDEX, initElasticsearch } from '../config/elasticsearch';
import { EmailWithRelations, PaginatedResult, IndexedEmailDocument } from '../types';

export class ElasticsearchService {
  /**
   * Initializes the Elasticsearch index with mappings
   */
  async initializeIndex(): Promise<void> {
    await initElasticsearch();
  }

  /**
   * Indexes or updates an email document in Elasticsearch
   */
  async indexEmail(email: EmailWithRelations): Promise<void> {
    try {
      const doc: IndexedEmailDocument = {
        id: email.id,
        userId: email.userId,
        senderId: email.senderId,
        senderEmail: email.sender?.email || '',
        batchId: email.batchId,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        status: email.status,
        scheduledAt: email.scheduledAt ? email.scheduledAt.toISOString() : null,
        sentAt: email.sentAt ? email.sentAt.toISOString() : null,
        errorMessage: email.errorMessage || null,
        etherealUrl: email.etherealUrl || null,
        createdAt: email.createdAt ? email.createdAt.toISOString() : null,
      };

      await esClient.index({
        index: EMAIL_INDEX,
        id: email.id,
        document: doc,
        refresh: true,
      });

      console.log(`[Elasticsearch] Indexed email doc: ${email.id}`);
    } catch (error: any) {
      console.error(`[Elasticsearch] Error indexing email ${email.id}:`, error.message || error);
    }
  }

  /**
   * Searches indexed emails by recipient, subject, or body for a specific user
   */
  async searchEmails(
    userId: string,
    queryStr: string,
    options?: { page?: number; limit?: number }
  ): Promise<PaginatedResult<IndexedEmailDocument>> {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.max(1, options?.limit || 20);
    const from = (page - 1) * limit;

    try {
      const trimmedQuery = queryStr?.trim();

      const mustClauses: any[] = [{ term: { userId } }];

      if (trimmedQuery && trimmedQuery.length > 0) {
        mustClauses.push({
          multi_match: {
            query: trimmedQuery,
            fields: ['recipient^3', 'recipient.keyword^4', 'subject^2', 'body'],
            fuzziness: 'AUTO',
            operator: 'and',
          },
        });
      }

      const response = await esClient.search<IndexedEmailDocument>({
        index: EMAIL_INDEX,
        from,
        size: limit,
        query: {
          bool: {
            must: mustClauses,
          },
        },
        sort: [{ scheduledAt: { order: 'desc', unmapped_type: 'date' } }],
      });

      const totalHits =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value || 0;

      const emails: IndexedEmailDocument[] = response.hits.hits
        .map((hit) => hit._source)
        .filter((doc): doc is IndexedEmailDocument => doc !== undefined);

      return {
        data: emails,
        total: totalHits,
        page,
        limit,
        totalPages: Math.ceil(totalHits / limit) || 1,
      };
    } catch (error: any) {
      console.error('[Elasticsearch] Search error:', error.message || error);
      // Return empty result gracefully instead of crashing
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 1,
      };
    }
  }
}

export const elasticsearchService = new ElasticsearchService();
export default elasticsearchService;
