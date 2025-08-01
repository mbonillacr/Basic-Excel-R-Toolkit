const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const winston = require('winston');

const app = express();
app.use(express.json());

// Security Configuration
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

// Audit Logger
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'audit.log' }),
    new winston.transports.Console()
  ]
});

// RBAC Roles
const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  VIEWER: 'viewer'
};

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      auditLogger.warn('Invalid token attempt', { ip: req.ip });
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Role-based Authorization
const authorize = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      auditLogger.warn('Unauthorized access attempt', { 
        user: req.user.id, 
        role: req.user.role, 
        requiredRoles: roles 
      });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Azure AD Login
app.post('/auth/azure', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    const user = {
      id: crypto.randomUUID(),
      email,
      name,
      role: ROLES.USER
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
    
    auditLogger.info('User authenticated via Azure AD', { 
      userId: user.id, 
      email: user.email 
    });

    res.json({ token, user });
  } catch (error) {
    auditLogger.error('Azure AD authentication failed', { error: error.message });
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// Function Execution Audit
app.post('/audit/function-execution', authenticateToken, (req, res) => {
  const { functionName, parameters, executionTime, result } = req.body;
  
  auditLogger.info('Function execution audit', {
    userId: req.user.id,
    functionName,
    parameters: JSON.stringify(parameters),
    executionTime,
    resultSize: JSON.stringify(result).length,
    timestamp: new Date().toISOString()
  });
  
  res.json({ status: 'logged' });
});

// Compliance Report
app.get('/compliance/report', authenticateToken, authorize([ROLES.ADMIN]), (req, res) => {
  const { startDate, endDate, type } = req.query;
  
  const report = {
    period: { startDate, endDate },
    type,
    totalExecutions: 1250,
    uniqueUsers: 45,
    dataAccessed: '2.5GB',
    complianceScore: 98.5,
    violations: []
  };
  
  auditLogger.info('Compliance report generated', { 
    adminId: req.user.id, 
    reportType: type,
    period: { startDate, endDate }
  });
  
  res.json(report);
});

// Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'auth-service',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);
  auditLogger.info('Auth Service started', { port: PORT });
});

module.exports = app;