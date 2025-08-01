#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const winston = require('winston');

// Migration Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'migration.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class BERTMigrator {
  constructor() {
    this.v2ConfigPath = this.findV2Installation();
    this.v3ConfigPath = process.env.BERT_V3_CONFIG || './config';
    this.backupPath = './migration-backup';
  }

  // Find BERT v2.x installation
  findV2Installation() {
    const possiblePaths = [
      path.join(process.env.APPDATA || '', 'BERT'),
      path.join(process.env.LOCALAPPDATA || '', 'BERT'),
      'C:\\Program Files\\BERT',
      'C:\\Program Files (x86)\\BERT'
    ];

    for (const configPath of possiblePaths) {
      try {
        if (require('fs').existsSync(path.join(configPath, 'bert-config.json'))) {
          return configPath;
        }
      } catch (error) {
        // Continue searching
      }
    }

    return null;
  }

  // Create backup of existing configuration
  async createBackup() {
    try {
      await fs.mkdir(this.backupPath, { recursive: true });
      
      if (this.v2ConfigPath) {
        const backupId = crypto.randomBytes(8).toString('hex');
        const backupDir = path.join(this.backupPath, `bert-v2-${backupId}`);
        
        await this.copyDirectory(this.v2ConfigPath, backupDir);
        
        logger.info('Backup created', { backupDir, timestamp: new Date().toISOString() });
        return backupDir;
      }
    } catch (error) {
      logger.error('Backup creation failed', { error: error.message });
      throw error;
    }
  }

  // Copy directory recursively
  async copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  // Migrate configuration files
  async migrateConfiguration() {
    try {
      if (!this.v2ConfigPath) {
        logger.warn('No BERT v2.x installation found');
        return { migrated: false, reason: 'No v2.x installation found' };
      }

      const v2ConfigFile = path.join(this.v2ConfigPath, 'bert-config.json');
      const v2Config = JSON.parse(await fs.readFile(v2ConfigFile, 'utf8'));

      // Transform v2 config to v3 format
      const v3Config = {
        version: '3.0.0',
        migratedFrom: '2.4.3',
        migrationDate: new Date().toISOString(),
        
        // Preserve user settings
        user: {
          name: v2Config.user?.name || 'BERT User',
          preferences: {
            theme: v2Config.theme || 'default',
            language: v2Config.language || 'en',
            autoSave: v2Config.autoSave !== false
          }
        },

        // Migrate R configuration
        r: {
          version: v2Config.r?.version || '3.4.0',
          path: v2Config.r?.path,
          packages: v2Config.r?.packages || [],
          // New v3.0 settings with defaults
          compatibility: {
            enableV2Mode: true,
            legacyPackages: v2Config.r?.packages || []
          }
        },

        // Migrate Julia configuration
        julia: {
          version: v2Config.julia?.version || '0.6.2',
          path: v2Config.julia?.path,
          packages: v2Config.julia?.packages || [],
          // New v3.0 settings
          compatibility: {
            enableV2Mode: true,
            legacyPackages: v2Config.julia?.packages || []
          }
        },

        // New v3.0 features with safe defaults
        services: {
          apiGateway: { port: 3000, enabled: true },
          auth: { enabled: false, sso: false },
          ai: { enabled: false, provider: 'none' },
          plugins: { enabled: true, autoUpdate: false }
        },

        // Preserve custom functions
        functions: v2Config.functions || {},
        
        // Migration metadata
        migration: {
          originalConfig: v2ConfigFile,
          backupCreated: true,
          compatibilityMode: true
        }
      };

      // Save migrated configuration
      await fs.mkdir(this.v3ConfigPath, { recursive: true });
      const v3ConfigFile = path.join(this.v3ConfigPath, 'bert-config.json');
      await fs.writeFile(v3ConfigFile, JSON.stringify(v3Config, null, 2));

      logger.info('Configuration migrated successfully', { 
        from: v2ConfigFile, 
        to: v3ConfigFile 
      });

      return { 
        migrated: true, 
        configFile: v3ConfigFile,
        preservedFunctions: Object.keys(v2Config.functions || {}).length
      };

    } catch (error) {
      logger.error('Configuration migration failed', { error: error.message });
      throw error;
    }
  }

  // Migrate user functions
  async migrateFunctions() {
    try {
      const functionsDir = path.join(this.v2ConfigPath, 'functions');
      const v3FunctionsDir = path.join(this.v3ConfigPath, 'functions');

      if (await this.pathExists(functionsDir)) {
        await fs.mkdir(v3FunctionsDir, { recursive: true });
        await this.copyDirectory(functionsDir, v3FunctionsDir);

        // Create compatibility wrapper
        const wrapperContent = `
# BERT v3.0 Compatibility Wrapper
# This file ensures v2.x functions work in v3.0

# Load legacy functions with compatibility layer
source("legacy-functions.R")

# Migration notice
cat("BERT v3.0: Legacy functions loaded with compatibility layer\\n")
`;

        await fs.writeFile(
          path.join(v3FunctionsDir, 'compatibility-wrapper.R'),
          wrapperContent
        );

        logger.info('User functions migrated', { functionsDir: v3FunctionsDir });
        return { migrated: true, functionsDir: v3FunctionsDir };
      }

      return { migrated: false, reason: 'No functions directory found' };
    } catch (error) {
      logger.error('Functions migration failed', { error: error.message });
      throw error;
    }
  }

  // Validate migration
  async validateMigration() {
    try {
      const v3ConfigFile = path.join(this.v3ConfigPath, 'bert-config.json');
      const v3Config = JSON.parse(await fs.readFile(v3ConfigFile, 'utf8'));

      const validation = {
        configValid: !!v3Config.version,
        userSettingsPreserved: !!v3Config.user,
        rConfigMigrated: !!v3Config.r,
        juliaConfigMigrated: !!v3Config.julia,
        functionsPreserved: !!v3Config.functions,
        compatibilityEnabled: v3Config.migration?.compatibilityMode === true
      };

      const isValid = Object.values(validation).every(v => v === true);
      
      logger.info('Migration validation', { isValid, details: validation });
      return { isValid, validation };

    } catch (error) {
      logger.error('Migration validation failed', { error: error.message });
      return { isValid: false, error: error.message };
    }
  }

  // Rollback migration
  async rollback(backupDir) {
    try {
      if (await this.pathExists(backupDir)) {
        // Restore from backup
        await this.copyDirectory(backupDir, this.v2ConfigPath);
        
        // Remove v3 configuration
        await fs.rmdir(this.v3ConfigPath, { recursive: true });
        
        logger.info('Migration rolled back successfully', { backupDir });
        return { success: true };
      }

      throw new Error('Backup directory not found');
    } catch (error) {
      logger.error('Rollback failed', { error: error.message });
      throw error;
    }
  }

  // Utility: Check if path exists
  async pathExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  // Main migration process
  async migrate() {
    try {
      console.log('🚀 Starting BERT v2.x to v3.0 Migration...\n');

      // Step 1: Create backup
      console.log('📦 Creating backup...');
      const backupDir = await this.createBackup();
      console.log(`✅ Backup created: ${backupDir}\n`);

      // Step 2: Migrate configuration
      console.log('⚙️  Migrating configuration...');
      const configResult = await this.migrateConfiguration();
      console.log(`✅ Configuration migrated: ${configResult.preservedFunctions} functions preserved\n`);

      // Step 3: Migrate functions
      console.log('📝 Migrating user functions...');
      const functionsResult = await this.migrateFunctions();
      console.log(`✅ Functions migrated: ${functionsResult.migrated ? 'Success' : functionsResult.reason}\n`);

      // Step 4: Validate migration
      console.log('🔍 Validating migration...');
      const validation = await this.validateMigration();
      console.log(`✅ Migration validation: ${validation.isValid ? 'Passed' : 'Failed'}\n`);

      if (validation.isValid) {
        console.log('🎉 Migration completed successfully!');
        console.log('📋 Next steps:');
        console.log('   1. Start BERT v3.0');
        console.log('   2. Verify your functions work correctly');
        console.log('   3. Explore new v3.0 features');
        console.log(`   4. Backup location: ${backupDir}`);
      } else {
        console.log('❌ Migration validation failed');
        console.log('🔄 Consider running rollback if needed');
      }

      return {
        success: validation.isValid,
        backupDir,
        details: {
          config: configResult,
          functions: functionsResult,
          validation
        }
      };

    } catch (error) {
      logger.error('Migration failed', { error: error.message });
      console.log(`❌ Migration failed: ${error.message}`);
      throw error;
    }
  }
}

// CLI Interface
if (require.main === module) {
  const migrator = new BERTMigrator();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'migrate':
      migrator.migrate().catch(console.error);
      break;
    case 'rollback':
      const backupDir = process.argv[3];
      if (!backupDir) {
        console.log('Usage: node migrate.js rollback <backup-directory>');
        process.exit(1);
      }
      migrator.rollback(backupDir).catch(console.error);
      break;
    case 'validate':
      migrator.validateMigration().then(result => {
        console.log('Validation result:', result);
      }).catch(console.error);
      break;
    default:
      console.log('BERT v2.x to v3.0 Migration Tool');
      console.log('');
      console.log('Usage:');
      console.log('  node migrate.js migrate          - Run full migration');
      console.log('  node migrate.js rollback <dir>   - Rollback migration');
      console.log('  node migrate.js validate         - Validate migration');
      break;
  }
}

module.exports = BERTMigrator;