const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const winston = require('winston');

const app = express();
app.use(express.json());

// Plugin Manager Configuration
const PLUGINS_DIR = process.env.PLUGINS_DIR || './plugins';
const PLUGIN_REGISTRY = process.env.PLUGIN_REGISTRY || './plugin-registry.json';

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'plugin-manager.log' }),
    new winston.transports.Console()
  ]
});

// Plugin Registry Management
class PluginRegistry {
  constructor() {
    this.plugins = new Map();
    this.loadRegistry();
  }

  async loadRegistry() {
    try {
      const data = await fs.readFile(PLUGIN_REGISTRY, 'utf8');
      const registry = JSON.parse(data);
      this.plugins = new Map(Object.entries(registry));
    } catch (error) {
      logger.info('Creating new plugin registry');
      this.plugins = new Map();
    }
  }

  async saveRegistry() {
    const registry = Object.fromEntries(this.plugins);
    await fs.writeFile(PLUGIN_REGISTRY, JSON.stringify(registry, null, 2));
  }

  register(pluginId, metadata) {
    this.plugins.set(pluginId, {
      ...metadata,
      registeredAt: new Date().toISOString(),
      status: 'registered'
    });
    this.saveRegistry();
  }

  get(pluginId) {
    return this.plugins.get(pluginId);
  }

  list() {
    return Array.from(this.plugins.values());
  }

  updateStatus(pluginId, status) {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.status = status;
      plugin.lastUpdated = new Date().toISOString();
      this.saveRegistry();
    }
  }
}

const registry = new PluginRegistry();

// Plugin Validation
const validatePlugin = (pluginManifest) => {
  const required = ['name', 'version', 'description', 'main', 'author'];
  const missing = required.filter(field => !pluginManifest[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }

  // Validate version format
  if (!/^\d+\.\d+\.\d+$/.test(pluginManifest.version)) {
    throw new Error('Invalid version format. Use semantic versioning (x.y.z)');
  }

  return true;
};

// Security validation
const validatePluginSecurity = async (pluginPath) => {
  try {
    const manifestPath = path.join(pluginPath, 'plugin.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    
    // Check for suspicious permissions
    const dangerousPermissions = ['file_system_write', 'network_unrestricted', 'system_exec'];
    const requestedPermissions = manifest.permissions || [];
    const suspicious = requestedPermissions.filter(p => dangerousPermissions.includes(p));
    
    if (suspicious.length > 0) {
      logger.warn('Plugin requests dangerous permissions', { 
        plugin: manifest.name, 
        permissions: suspicious 
      });
    }

    return {
      safe: suspicious.length === 0,
      warnings: suspicious,
      permissions: requestedPermissions
    };
  } catch (error) {
    throw new Error('Security validation failed: ' + error.message);
  }
};

// List all plugins
app.get('/plugins', (req, res) => {
  try {
    const plugins = registry.list();
    res.json({ plugins });
  } catch (error) {
    logger.error('Failed to list plugins', { error: error.message });
    res.status(500).json({ error: 'Failed to list plugins' });
  }
});

// Get plugin details
app.get('/plugins/:id', (req, res) => {
  try {
    const plugin = registry.get(req.params.id);
    if (!plugin) {
      return res.status(404).json({ error: 'Plugin not found' });
    }
    res.json(plugin);
  } catch (error) {
    logger.error('Failed to get plugin details', { error: error.message });
    res.status(500).json({ error: 'Failed to get plugin details' });
  }
});

// Install plugin
app.post('/plugins/install', async (req, res) => {
  try {
    const { pluginUrl, manifest } = req.body;
    
    if (!manifest) {
      return res.status(400).json({ error: 'Plugin manifest required' });
    }

    // Validate plugin manifest
    validatePlugin(manifest);
    
    const pluginId = crypto.createHash('md5').update(manifest.name + manifest.version).digest('hex');
    const pluginPath = path.join(PLUGINS_DIR, pluginId);

    // Create plugin directory
    await fs.mkdir(pluginPath, { recursive: true });
    
    // Save manifest
    await fs.writeFile(
      path.join(pluginPath, 'plugin.json'), 
      JSON.stringify(manifest, null, 2)
    );

    // Security validation
    const securityCheck = await validatePluginSecurity(pluginPath);
    
    // Register plugin
    registry.register(pluginId, {
      ...manifest,
      id: pluginId,
      path: pluginPath,
      security: securityCheck
    });

    logger.info('Plugin installed', { 
      pluginId, 
      name: manifest.name, 
      version: manifest.version 
    });

    res.json({ 
      success: true, 
      pluginId, 
      security: securityCheck 
    });

  } catch (error) {
    logger.error('Plugin installation failed', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

// Activate plugin
app.post('/plugins/:id/activate', (req, res) => {
  try {
    const plugin = registry.get(req.params.id);
    if (!plugin) {
      return res.status(404).json({ error: 'Plugin not found' });
    }

    registry.updateStatus(req.params.id, 'active');
    
    logger.info('Plugin activated', { pluginId: req.params.id, name: plugin.name });
    res.json({ success: true, status: 'active' });

  } catch (error) {
    logger.error('Plugin activation failed', { error: error.message });
    res.status(500).json({ error: 'Plugin activation failed' });
  }
});

// Deactivate plugin
app.post('/plugins/:id/deactivate', (req, res) => {
  try {
    const plugin = registry.get(req.params.id);
    if (!plugin) {
      return res.status(404).json({ error: 'Plugin not found' });
    }

    registry.updateStatus(req.params.id, 'inactive');
    
    logger.info('Plugin deactivated', { pluginId: req.params.id, name: plugin.name });
    res.json({ success: true, status: 'inactive' });

  } catch (error) {
    logger.error('Plugin deactivation failed', { error: error.message });
    res.status(500).json({ error: 'Plugin deactivation failed' });
  }
});

// Plugin marketplace - browse available plugins
app.get('/marketplace', (req, res) => {
  const marketplacePlugins = [
    {
      id: 'python-service',
      name: 'Python Language Service',
      version: '1.0.0',
      description: 'Execute Python code in Excel with pandas and numpy support',
      author: 'BERT Team',
      category: 'language',
      downloads: 1250,
      rating: 4.8,
      verified: true
    },
    {
      id: 'data-viz-enhanced',
      name: 'Enhanced Data Visualization',
      version: '2.1.0',
      description: 'Advanced plotting capabilities with interactive charts',
      author: 'Community',
      category: 'visualization',
      downloads: 890,
      rating: 4.6,
      verified: false
    },
    {
      id: 'ml-toolkit',
      name: 'Machine Learning Toolkit',
      version: '1.5.0',
      description: 'Integrated ML algorithms for predictive analytics',
      author: 'ML Solutions Inc',
      category: 'analytics',
      downloads: 2100,
      rating: 4.9,
      verified: true
    }
  ];

  res.json({ plugins: marketplacePlugins });
});

// Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'plugin-manager',
    pluginsCount: registry.plugins.size,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`Plugin Manager running on port ${PORT}`);
  logger.info('Plugin Manager started', { port: PORT });
});

module.exports = app;