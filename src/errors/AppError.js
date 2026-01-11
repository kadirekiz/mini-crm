class AppError extends Error {
  /**
   * @param {string} message
   * @param {{status?: number, code?: string, details?: any}} options
   */
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.status = options.status ?? 500;
    this.code = options.code ?? 'INTERNAL_ERROR';
    this.details = options.details ?? null;
  }
}

class ValidationError extends AppError {
  constructor(message = 'Geçersiz istek', details = null) {
    super(message, { status: 400, code: 'VALIDATION_ERROR', details });
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Kayıt bulunamadı', details = null) {
    super(message, { status: 404, code: 'NOT_FOUND', details });
  }
}

class ConflictError extends AppError {
  constructor(message = 'Çakışma', details = null) {
    super(message, { status: 409, code: 'CONFLICT', details });
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError
};
