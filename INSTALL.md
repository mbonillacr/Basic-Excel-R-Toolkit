# BERT v3.0 Installation Guide

## Quick Start

### Prerequisites
- Docker Desktop 4.0+
- Node.js 18+
- Git
- Windows 10/11 (for Excel Desktop integration)

### 1. Clone and Setup
```bash
git clone https://github.com/your-repo/Basic-Excel-R-Toolkit.git
cd Basic-Excel-R-Toolkit
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env.production

# Edit configuration
notepad .env.production
```

### 3. Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Install service dependencies
cd services/api-gateway && npm install && cd ../..
cd services/r-service && npm install && cd ../..
cd services/julia-service && npm install && cd ../..
cd services/auth-service && npm install && cd ../..
cd services/ai-service && npm install && cd ../..
cd services/plugin-manager && npm install && cd ../..
cd services/python-service && npm install && cd ../..
```

### 4. Start BERT v3.0
```bash
# Start all services
docker-compose up -d

# Start monitoring (optional)
docker-compose -f monitoring/docker-compose.monitoring.yml up -d
```

### 5. Verify Installation
- API Gateway: http://localhost:3000/health
- Grafana: http://localhost:3000 (admin/bert-admin-2024)
- Kibana: http://localhost:5601

### 6. Migration from BERT v2.x (if applicable)
```bash
# Run migration tool
node tools/migration/migrate.js migrate
```

## Access Points
- **Excel Add-in**: Install from web-clients/excel-online/
- **Web Console**: http://localhost:3000/console
- **Admin Dashboard**: http://localhost:3000/admin

## Troubleshooting
- Check logs: `docker-compose logs`
- Restart services: `docker-compose restart`
- Reset: `docker-compose down && docker-compose up -d`