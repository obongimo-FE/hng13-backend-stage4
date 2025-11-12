export const formatSuccessResponse = (data, message = 'Success', meta = {}) => {
  return {
    success: true,
    data: data || undefined,
    message,
    meta: {
      total: meta.total ?? (data ? 1 : 0),
      limit: meta.limit ?? 1,
      page: meta.page ?? 1,
      total_pages: meta.total_pages ?? 1,
      has_next: meta.has_next ?? false,
      has_previous: meta.has_previous ?? false,
      ...meta
    }
  };
};

export const formatErrorResponse = (error, message = 'An error occurred') => {
  // Handle both string and object error formats
  const errorCode = typeof error === 'string' ? error : (error?.code || 'internal_error');
  const errorMessage = typeof error === 'object' && error?.message ? error.message : message;
  
  return {
    success: false,
    error: errorCode,
    message: errorMessage,
    meta: {
      total: 0,
      limit: 1,
      page: 1,
      total_pages: 1,
      has_next: false,
      has_previous: false
    }
  };
};