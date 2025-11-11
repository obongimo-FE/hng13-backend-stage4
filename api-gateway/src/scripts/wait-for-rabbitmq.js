#!/usr/bin/env node

const net = require('net');
const { exec } = require('child_process');

const host = process.env.RABBITMQ_HOST || 'localhost';
const port = process.env.RABBITMQ_PORT || 5672;
const timeout = 30000; // 30 seconds

function waitForService(host, port, timeout) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    function attemptConnection() {
      const client = net.connect(port, host, () => {
        client.end();
        resolve();
      });
      
      client.on('error', () => {
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for ${host}:${port}`));
        } else {
          setTimeout(attemptConnection, 1000);
        }
      });
    }
    
    attemptConnection();
  });
}

waitForService(host, port, timeout)
  .then(() => {
    console.log(`✅ RabbitMQ is ready at ${host}:${port}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  });