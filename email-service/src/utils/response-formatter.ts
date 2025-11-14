interface PaginationMeta {
  total: number;
  limit: number;
  page: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

interface SuccessResponse<T> {
  success: true;
  data?: T;
  message: string;
  meta: PaginationMeta;
}

interface ErrorResponse {
  success: false;
  error?: string;
  message: string;
  meta: PaginationMeta;
}

export const formatSuccessResponse = <T>(
  data: T | null = null,
  message: string = 'Success',
  meta: Partial<PaginationMeta> = {}
): SuccessResponse<T> => {
  const response: SuccessResponse<T> = {
    success: true,
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
  
  // Only include data if it's not null/undefined (for exactOptionalPropertyTypes)
  if (data !== null && data !== undefined) {
    response.data = data;
  }
  
  return response;
};

export const formatErrorResponse = (
  message: string,
  error?: string
): ErrorResponse => {
  const response: ErrorResponse = {
    success: false,
    message,
    meta: {
      total: 0,
      limit: 1,
      page: 1,
      total_pages: 1,
      has_next: false,
      has_previous: false
    }
  };
  
  // Only include error if provided (for exactOptionalPropertyTypes)
  if (error !== undefined) {
    response.error = error;
  }
  
  return response;
};

