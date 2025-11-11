/**
 * Format responses to use snake_case as required
 */
export const formatSuccessResponse = (data, message = 'Success', meta = {}) => {
  const base_response = {
    success: true,
    data,
    message,
    meta: {
      total: meta.total || 1,
      limit: meta.limit || 1,
      page: meta.page || 1,
      total_pages: meta.total_pages || 1,
      has_next: meta.has_next || false,
      has_previous: meta.has_previous || false,
      ...meta
    }
  };

  return base_response;
};

export const formatErrorResponse = (error, message = 'An error occurred') => {
  return {
    success: false,
    error: error.code || 'internal_error',
    message,
    ...(error.details && { details: error.details })
  };
};

/**
 * Convert object keys to snake_case
 */
export const toSnakeCase = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCase(item));
  }
  
  return Object.keys(obj).reduce((acc, key) => {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    acc[snakeKey] = toSnakeCase(obj[key]);
    return acc;
  }, {});
};