export class ResponseFormatter {
  static success(data = null, message = 'Operation successful') {
    const response = {
      success: true,
      message,
      meta: {
        total: 1,
        limit: 1,
        page: 1,
        total_pages: 1,
        has_next: false,
        has_previous: false,
        timestamp: new Date().toISOString()
      }
    };

    if (data !== null) {
      response.data = data;
    }

    return response;
  }

  static error(error, message = 'Operation failed') {
    return {
      success: false,
      error: error,
      message,
      meta: {
        total: 1,
        limit: 1,
        page: 1,
        total_pages: 1,
        has_next: false,
        has_previous: false,
        timestamp: new Date().toISOString()
      }
    };
  }
}