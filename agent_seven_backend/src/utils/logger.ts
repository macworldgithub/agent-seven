import { env } from '../config/env';

const formatMessage = (level: string, message: string) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
};

export const logger = {
  info: (message: string) => console.log(formatMessage('info', message)),
  error: (message: string) => console.error(formatMessage('error', message)),
  warn: (message: string) => console.warn(formatMessage('warn', message)),
  debug: (message: string) => {
    if (env.NODE_ENV !== 'production') {
      console.debug(formatMessage('debug', message));
    }
  }
};
