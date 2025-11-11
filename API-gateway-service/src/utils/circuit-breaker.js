import CircuitBreaker from 'opossum';
import { constants } from '../config/constants.js';

const createCircuitBreaker = (serviceName) => {
  const options = {
    timeout: constants.circuit_breaker.timeout,
    errorThresholdPercentage: constants.circuit_breaker.error_threshold,
    resetTimeout: constants.circuit_breaker.reset_timeout,
    name: `${serviceName}-circuit-breaker`
  };

  const breaker = new CircuitBreaker(async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }, options);

  breaker.on('open', () => {
    console.log(`Circuit breaker OPENED for ${serviceName}`);
  });

  breaker.on('halfOpen', () => {
    console.log('Circuit breaker HALF-OPEN');
  });

  breaker.on('close', () => {
    console.log(`Circuit breaker CLOSED for ${serviceName}`);
  });

  breaker.fallback(() => {
    throw new Error(`${serviceName} is temporarily unavailable`);
  });

  return breaker;
};

export const userServiceBreaker = createCircuitBreaker('user-service');
export const templateServiceBreaker = createCircuitBreaker('template-service');

export const getAllCircuitBreakerStats = () => {
  return {
    user_service: {
      state: userServiceBreaker.opened ? 'OPEN' : userServiceBreaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
      stats: userServiceBreaker.stats
    },
    template_service: {
      state: templateServiceBreaker.opened ? 'OPEN' : templateServiceBreaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
      stats: templateServiceBreaker.stats
    }
  };
};