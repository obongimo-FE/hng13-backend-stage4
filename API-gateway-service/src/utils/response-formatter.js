export const formatSuccessResponse = (data, message = 'Success', meta = {}) => {
  return {
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
};

export const formatErrorResponse = (error, message = 'An error occurred') => {
  return {
    success: false,
    error: error.code || 'internal_error',
    message,
    ...(error.details && { details: error.details })
  };
};