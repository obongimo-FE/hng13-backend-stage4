import { config } from '../config/env.js';
import { userServiceBreaker, templateServiceBreaker } from './circuit-breaker.js';

/**
 * Fetch user data from User Service
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User data
 */
export const fetchUser = async (userId) => {
  const url = `${config.services.user}/api/v1/users/${userId}`;
  
  try {
    const response = await userServiceBreaker.fire(url);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch user');
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error.message);
    throw error;
  }
};

/**
 * Fetch template from Template Service
 * @param {string} templateName - Template name
 * @returns {Promise<Object>} Template data
 */
export const fetchTemplate = async (templateName) => {
  const url = `${config.services.template}/api/v1/templates/${templateName}`;
  
  try {
    const response = await templateServiceBreaker.fire(url);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch template');
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching template ${templateName}:`, error.message);
    throw error;
  }
};


