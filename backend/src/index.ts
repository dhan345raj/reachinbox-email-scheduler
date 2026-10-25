import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config';
import prisma from './config/database';
import redisClient from './config/redis';
import { serverAdapter } from './config/queue';
import { initElasticsearch } from './config/elasticsearch';
import apiRoutes from './routes';
import { startEmailWorker, stopEmailWorker } from './workers/email.worker';

const app = express();

// 1. Configure CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl) or matching configured frontend
      if (
        !origin ||
        origin === config.frontendUrl ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1')
      ) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev to avoid CORS friction
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  })
);

// 2. Configure body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Mount Bull Board monitoring dashboard at /admin/queues
app.use('/admin/queues', serverAdapter.getRouter());

// 4. Mount API routes at /api
app.use('/api', apiRoutes);

// Root greeting & health
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'ReachInbox Email Scheduler Backend',
    version: '1.0.0',
    status: 'running',
    docs: {
      adminQueues: '/admin/queues',
      apiHealth: '/api/health',
    },
  });
});

// 5. 404 Not Found handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// 6. Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[GlobalErrorHandler]', err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    ...(config.nodeEnv === 'development' ? { stack: err.stack } : {}),
  });
});

// 7. Start server and background services
async function bootstrap() {
  try {
    console.log('----------------------------------------------------');
    console.log('Starting ReachInbox Email Scheduler Service...');
    console.log(`Environment: ${config.nodeEnv}`);

    // Test database connection
    await prisma.$connect();
    console.log('[Database] Connected to PostgreSQL via Prisma');

    // Initialize Elasticsearch index and mappings (non-fatal)
    try {
      await initElasticsearch();
      console.log('Elasticsearch index initialized');
    } catch (esError) {
      console.warn('[WARNING] Elasticsearch initialization failed. Search functionality will be unavailable:', esError);
    }

    // Start BullMQ Worker and restore any pending jobs from DB
    await startEmailWorker();

    // Start HTTP server
    const server = app.listen(config.port, () => {
      console.log(`[HTTP Server] Listening on port ${config.port}`);
      console.log(`[Bull Board] Dashboard available at http://localhost:${config.port}/admin/queues`);
      console.log(`[API] Routes mounted at http://localhost:${config.port}/api`);
      console.log('----------------------------------------------------');
    });

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);

      server.close(async () => {
        console.log('[HTTP Server] Closed incoming connections.');
        try {
          await stopEmailWorker();
          await prisma.$disconnect();
          await redisClient.quit();
          console.log('[Server] Graceful shutdown completed.');
          process.exit(0);
        } catch (shutdownErr) {
          console.error('[Server] Error during shutdown:', shutdownErr);
          process.exit(1);
        }
      });

      // Force exit after 10s if graceful shutdown hangs
      setTimeout(() => {
        console.error('[Server] Forcing shutdown after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error: any) {
    console.error('[Bootstrap] Fatal startup error:', error);
    process.exit(1);
  }
}

bootstrap();

export default app;
