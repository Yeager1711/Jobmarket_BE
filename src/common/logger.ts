import { LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

const { combine, timestamp, colorize, printf } = winston.format;

// Function to format timestamps
const formatTimestamp = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `[${year}-${month}-${day}] - [${hours}h${minutes}p ${seconds}s]`;
};

export class WinstonLoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor(logDirectory = 'logs', logFileFormat = 'app-yyyy-MM-dd.log') {
    // Ensure the log directory exists
    if (!fs.existsSync(logDirectory)) {
      fs.mkdirSync(logDirectory, { recursive: true });
    }

    // Generate dynamic file name based on the current date
    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const logFilePath = path.join(logDirectory, logFileFormat.replace('yyyy-MM-dd', formattedDate));

    // Initialize the Winston logger with dynamic file path
    this.logger = winston.createLogger({
      level: 'info',
      format: combine(
        colorize(),
        timestamp(),
        printf(({ timestamp, level, message }) => `${formatTimestamp()} [${level}]: ${message}\n`)
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: logFilePath }), // Dynamic file path
      ],
      levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        verbose: 4,
        debug: 5,
        silly: 6,
      },
      exitOnError: false,
    });
  }

  log(message: any) {
    this.logger.info(message);
  }

  info(message: any) {
    this.logger.info(message);
  }

  error(message: any, trace?: string) {
    if (trace) {
      this.logger.error(`${message} - Stack trace: ${trace}`);
    } else {
      this.logger.error(message);
    }
  }

  warn(message: any) {
    this.logger.warn(message);
  }

  debug(message: any) {
    this.logger.debug(message);
  }

  verbose(message: any) {
    this.logger.verbose(message);
  }
}
