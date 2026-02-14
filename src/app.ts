import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import routes from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { notFoundHandler } from './middlewares/not-found.middleware';

export const createApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Rate limiting
  if (config.rateLimit) {
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      message: 'Too many requests from this IP, please try again later.',
    });
    app.use('/api/v1/', limiter);
    console.log(`Rate limiting enabled: ${config.rateLimit.max} requests per ${config.rateLimit.windowMs / 60000} minutes`);
  } else {
    console.log('Rate limiting disabled');
  }

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging middleware
  if (config.server.nodeEnv === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // Routes
  app.use('/api/v1', routes);

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'CrowdSec Monitor API',
      version: '1.0.0',
      endpoints: {
        apiHealth: '/api/v1/api-health',
        lapiStatus: '/api/v1/lapi-status',
        alerts: '/api/v1/alerts',
        decisions: '/api/v1/decisions',
      },
    });
  });

  // Error handling middleware (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
