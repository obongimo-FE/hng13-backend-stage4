import { formatErrorResponse } from '../utils/response-formatter.js';

export const validateNotificationRequest = async (request, reply) => {
  const { user_id, template_name, variables } = request.body;

  if (!user_id || !template_name || variables === undefined) {
    return reply.code(400).send(
      formatErrorResponse(
        { code: 'validation_error' },
        'user_id, template_name, and variables are required'
      )
    );
  }

  if (typeof user_id !== 'string' || user_id.trim() === '') {
    return reply.code(400).send(
      formatErrorResponse(
        { code: 'validation_error' },
        'user_id must be a non-empty string'
      )
    );
  }

  if (typeof template_name !== 'string' || template_name.trim() === '') {
    return reply.code(400).send(
      formatErrorResponse(
        { code: 'validation_error' },
        'template_name must be a non-empty string'
      )
    );
  }

  if (typeof variables !== 'object' || variables === null) {
    return reply.code(400).send(
      formatErrorResponse(
        { code: 'validation_error' },
        'variables must be an object'
      )
    );
  }
};