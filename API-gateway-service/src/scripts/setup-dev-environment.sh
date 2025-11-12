#!/bin/bash

echo "🚀 Setting up Development Environment for API Gateway"

# Check if running on Ubuntu/Debian
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
else
    echo "Cannot detect operating system"
    exit 1
fi

echo "Detected OS: $OS"

# Install Redis
echo "Installing Redis..."
if command -v apt &> /dev/null; then
    sudo apt update
    sudo apt install redis-server -y
elif command -v yum &> /dev/null; then
    sudo yum install redis -y
else
    echo "Package manager not supported. Please install Redis manually."
    exit 1
fi

# Install RabbitMQ
echo "Installing RabbitMQ..."
if command -v apt &> /dev/null; then
    # Add RabbitMQ repository
    curl -fsSL https://github.com/rabbitmq/signing-keys/releases/download/2.0/rabbitmq-release-signing-key.asc | sudo gpg --dearmor -o /usr/share/keyrings/rabbitmq-archive-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/rabbitmq-archive-keyring.gpg] https://dl.bintray.com/rabbitmq/debian $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/rabbitmq.list
    sudo apt update
    sudo apt install rabbitmq-server -y
else
    echo "RabbitMQ installation script only supports apt-based systems for now."
    echo "Please install RabbitMQ manually from: https://www.rabbitmq.com/download.html"
fi

# Start and enable services
echo "⚡ Starting services..."
sudo systemctl enable redis-server
sudo systemctl enable rabbitmq-server
sudo systemctl start redis-server
sudo systemctl start rabbitmq-server

# Configure RabbitMQ
echo "Configuring RabbitMQ..."
sudo rabbitmq-plugins enable rabbitmq_management
sudo rabbitmqctl add_user admin password 2>/dev/null || true
sudo rabbitmqctl set_user_tags admin administrator 2>/dev/null || true
sudo rabbitmqctl set_permissions -p / admin ".*" ".*" ".*" 2>/dev/null || true

# Test services
echo "Testing services..."
if redis-cli ping | grep -q "PONG"; then
    echo "Redis is running"
else
    echo "Redis failed to start"
fi

if sudo rabbitmqctl status &> /dev/null; then
    echo "RabbitMQ is running"
    echo "RabbitMQ Management UI: http://localhost:15672 (admin/password)"
else
    echo "RabbitMQ failed to start"
fi

echo "Development environment setup complete!"
echo "Next steps:"
echo "   1. Run: npm install"
echo "   2. Run: npm run generate-token"
echo "   3. Run: npm run dev"