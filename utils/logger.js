const { createLogger, format, transports, Logger } = require('winston');
const onFinished = require('on-finished');

const consoleTimestampColorize = format((info) => {
  info.timestamp = '\x1b[2m' + info.timestamp + '\x1b[0m';
  return info;
});
const levelUpperCase = format((info) => {
  info.level = info.level.toUpperCase();
  return info;
});
const consoleLogFormat = format.combine(
  levelUpperCase(),
  format.timestamp({ format: 'hh:mm:ss A' }),
  consoleTimestampColorize(),
  format.colorize({
    colors: { info: 'cyan', debug: 'green', error: 'red', warn: 'yellow' },
  }),
  format.printf(({ level, message, timestamp, metadata }) => {
    const metadata_keys = Object.keys(metadata);
    return `[${level}][${timestamp}]: ${message} ${
      metadata_keys.length > 0 ? JSON.stringify(metadata) : ''
    }`;
  })
);

function getLoggerTransports() {
  return [new transports.Console({ format: consoleLogFormat })];
}

function getLoggerFormat() {
  const { metadata, combine, json, errors, timestamp } = format;
  return combine(
    errors({ stack: true }),
    metadata({
      key: 'metadata',
      fillExcept: ['message', 'level', 'timestamp', 'label'],
    }),
    json()
  );
}

function getDefaultMeta() {
  return {};
}

class WinstonLogger {
  constructor() {
    if (WinstonLogger.instance) {
      this.error('WinstonLogger is already initialized!');
    }
    this.logger = createLogger({
      level: 'debug',
      format: getLoggerFormat(),
      defaultMeta: getDefaultMeta(),
      transports: getLoggerTransports(),
    });
    this.debug('Winston Logger initialized successfully');
  }

  static getInstance() {
    if (WinstonLogger.instance) {
      return WinstonLogger.instance;
    }
    return (WinstonLogger.instance = new WinstonLogger());
  }

  info(message = '', ...args) {
    this.logger.info(message, { ...args });
  }

  warn(message = '', ...args) {
    this.logger.warn(message, { ...args });
  }

  error(message = '', ...args) {
    this.logger.error(message, { ...args });
  }
  debug(message = '', ...args) {
    this.logger.log('debug', message, { ...args });
  }
}

async function winstonHTTPMiddleware(req, res, next) {
  const method = req.method;
  const url = req.originalUrl;
  const startTime = Date.now();
  let response_body = { data: null };
  // res.json interceptor to get the response body
  const originJSON = res.json;
  res.json = (body) => {
    response_body = body;
    return originJSON.call(res, body);
  };
  onFinished(res, (_e, res) => {
    const logger = WinstonLogger.getInstance();
    const totalTime = Date.now() - startTime;
    const statusCode = res.statusCode;
    const logMessage = `[${method}]:${statusCode} - ${url}`;
    const response = {
      error: response_body.error,
      message: response_body.message,
    };

    if (statusCode >= 400) {
      logger.error(logMessage, response);
    } else if (statusCode >= 300 && statusCode <= 399) {
      logger.warn(logMessage, response);
    } else {
      logger.info(logMessage, response);
    }
  });
  next();
}

module.exports = {
  logger: WinstonLogger.getInstance(),
  winstonHTTPMiddleware,
};
