import { Client } from '@elastic/elasticsearch';
import { config } from './index';

export const esClient = new Client({
  node: config.elasticsearch.url,
});

export const EMAIL_INDEX = config.elasticsearch.index;

export async function initElasticsearch(): Promise<void> {
  try {
    const exists = await esClient.indices.exists({ index: EMAIL_INDEX });

    if (!exists) {
      await esClient.indices.create({
        index: EMAIL_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              userId: { type: 'keyword' },
              senderId: { type: 'keyword' },
              senderEmail: { type: 'keyword' },
              batchId: { type: 'keyword' },
              recipient: {
                type: 'text',
                fields: {
                  keyword: { type: 'keyword' },
                },
              },
              subject: { type: 'text' },
              body: { type: 'text' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              errorMessage: { type: 'text' },
              etherealUrl: { type: 'keyword' },
              createdAt: { type: 'date' },
            },
          },
        },
      });
      console.log(`[Elasticsearch] Index "${EMAIL_INDEX}" created with mappings.`);
    } else {
      console.log(`[Elasticsearch] Index "${EMAIL_INDEX}" already exists.`);
    }
  } catch (error: any) {
    console.error('[Elasticsearch] Initialization error:', error.message || error);
  }
}

export default esClient;
