const logger = require('../../config/logger');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || 'SERVER_ERROR';

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = err.errors?.map(e => e.message).join(', ') || 'Validation failed';
  }
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    code = 'CONSTRAINT_ERROR';
    message = 'Referenced record not found';
  }

  if (statusCode === 500) {
    logger.error(`[${req.method}] ${req.path} — ${err.stack || message}`);
  }

  res.status(statusCode).json({
    success: false,
    code,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

class AppError extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

module.exports = { errorHandler, AppError };
