#!/usr/bin/env node

/**
 * Flight Schedule Validator CLI
 * Command Line Interface for the Flight Schedule Validator
 */
const { program } = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');

// Import modules
const fileHandler = require('../lib/fileHandler');
const dataMapper = require('../lib/dataMapper');
const validator = require('../lib/validator');
const referenceData = require('../lib/referenceData');
const reportGenerator = require('../lib/reportGenerator');
const configManager = require('../lib/configManager');
const promptsManager = require('./prompts');
const jsonFormatter = require('../lib/jsonFormatter');

// Define version and description
program
  .name('validator-cli')
  .description('Flight Schedule Validator CLI')
  .version('1.0.0');

/**
 * Validate Command
 * Validates a flight schedule file
 */
program
  .command('validate <file>')
  .description('Validate a flight schedule file')
  .option('-m, --mapping <profile>', 'Use a saved mapping profile')
  .option('-o, --output <file>', 'Output validation results to file')
  .option('-f, --format <format>', 'Specify input format (csv|json|xlsx)')
  .option('-r, --reference-data <dir>', 'Directory containing reference data files')
  .option('-e, --entity-type <type>', 'Entity type to validate', 'flights')
  .option('-i, --interactive', 'Run in interactive mode', true)
  .option('-v, --verbose', 'Show detailed validation information')
  .option('--no-color', 'Disable colored output')
  .action(async (file, options) => {
    try {
      // Load config
      const config = configManager.loadConfig();
      
      // Check if file exists
      if (!fs.existsSync(file)) {
        console.error(chalk.red(`Error: File ${file} not found`));
        process.exit(1);
      }

      // Get file information
      const fileInfo = fileHandler.getFileStats(file);
      console.log(chalk.bold(`\nValidating file: ${fileInfo.name} (${fileInfo.sizeFormatted})`));
      
      // Detect file format if not specified
      const format = options.format || fileHandler.detectFileFormat(file);
      console.log(`File format: ${chalk.cyan(format.toUpperCase())}`);
      
      // Parse the file
      console.log('Parsing file...');
      const rawData = await fileHandler.parseFile(file, format);
      console.log(`Found ${chalk.cyan(rawData.length)} records`);

      // Get the source fields from the first record
      const sourceFields = rawData.length > 0 ? Object.keys(rawData[0]) : [];
      console.log(`Found ${chalk.cyan(sourceFields.length)} fields: ${sourceFields.join(', ')}`);
      
      let mappedData;
      let mappingProfile;
      
      // Handle mapping
      if (options.mapping) {
        // Use saved mapping profile
        console.log(`Using mapping profile: ${chalk.cyan(options.mapping)}`);
        try {
          mappingProfile = dataMapper.loadMappingProfile(options.mapping);
        } catch (error) {
          console.error(chalk.red(`Error loading mapping profile: ${error.message}`));
          process.exit(1);
        }
      } else if (options.interactive) {
        // Interactive mapping
        console.log(chalk.bold('\nColumn Mapping'));
        mappingProfile = await promptsManager.handleMappingPrompts(sourceFields, options.entityType);
      } else {
        // Auto-mapping
        console.log('Attempting automatic field mapping...');
        const targetFields = dataMapper.getMappingFields(options.entityType);
        const suggestedMappings = dataMapper.generateMappingSuggestions(sourceFields, targetFields);
        
        mappingProfile = {
          profileName: 'auto-mapping',
          entityType: options.entityType,
          lastUsed: new Date().toISOString(),
          mappings: suggestedMappings,
          transformations: {
            ScheduledTime: 'convertDateTime',
            IsArrival: 'stringToBoolean'
          }
        };
        
        console.log('Auto-mapped fields:');
        Object.entries(suggestedMappings).forEach(([target, source]) => {
          if (source) {
            console.log(`  ${chalk.green('✓')} ${target} ⟵ ${source}`);
          } else {
            console.log(`  ${chalk.red('✗')} ${target} ⟵ (unmapped)`);
          }
        });
      }
      
      // Apply mapping
      console.log('\nApplying column mapping...');
      mappedData = dataMapper.applyMapping(rawData, mappingProfile);
      
      // Load reference data if provided
      let refData;
      if (options.referenceData) {
        console.log(`\nLoading reference data from ${options.referenceData}...`);
        try {
          refData = await referenceData.loadAllReferenceData(options.referenceData);
        } catch (error) {
          console.warn(chalk.yellow(`Warning: ${error.message}`));
          console.log('Continuing without reference data validation');
        }
      }
      
      // Perform validation
      console.log(chalk.bold('\nValidating data...'));
      const validationStartTime = Date.now();
      
      // Basic schema validation first
      const schemaResults = validator.validateSchema(mappedData, options.entityType);
      
      // Reference data validation if available
      let integrityResults = { errors: [], warnings: [] };
      if (refData) {
        integrityResults = validator.validateDataIntegrity(mappedData, refData);
      }
      
      // Business rules validation
      const businessRuleSettings = {
        minTurnaroundMinutes: config.validation.minTurnaroundMinutes,
        minTransferMinutes: config.validation.minTransferMinutes,
        maxTransferMinutes: config.validation.maxTransferMinutes
      };
      const businessResults = validator.validateBusinessRules(mappedData, businessRuleSettings);
      
      // Combine results
      const combinedResults = {
        isValid: schemaResults.isValid && integrityResults.isValid && businessResults.isValid,
        errors: [...schemaResults.errors, ...integrityResults.errors, ...businessResults.errors],
        warnings: [...schemaResults.warnings, ...integrityResults.warnings, ...businessResults.warnings]
      };
      
      const validationEndTime = Date.now();
      const validationTime = (validationEndTime - validationStartTime) / 1000;
      console.log(`Validation completed in ${validationTime.toFixed(2)} seconds`);
      
      // Generate report
      const report = reportGenerator.generateValidationReport(combinedResults, {
        filename: fileInfo.name,
        recordCount: mappedData.length,
        entityType: options.entityType,
        includeDetailedErrors: true,
        includeWarnings: true
      });
      
      // Display results
      const displayOptions = {
        colorize: options.color,
        detailedErrors: options.verbose ? 50 : 5,
        detailedWarnings: options.verbose ? 50 : 5,
        showSummary: true
      };
      
      console.log(reportGenerator.formatReportForDisplay(report, displayOptions));
      
      // Save report if output is specified
      if (options.output) {
        try {
          const outputFormat = path.extname(options.output).toLowerCase() === '.csv' ? 'csv' : 'json';
          
          if (outputFormat === 'csv') {
            reportGenerator.exportToCsv(report, options.output);
          } else {
            reportGenerator.exportToJson(report, options.output);
          }
          
          console.log(chalk.green(`Report saved to: ${options.output}`));
        } catch (error) {
          console.error(chalk.red(`Error saving report: ${error.message}`));
        }
      }
      
      // Exit with appropriate code
      process.exit(report.isValid ? 0 : 1);
    } catch (error) {
      console.error(chalk.red(`Error during validation: ${error.message}`));
      if (options.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

/**
 * Map Command
 * Creates or edits a mapping profile
 */
program
  .command('map <file>')
  .description('Create or edit a mapping profile')
  .option('-o, --output <file>', 'Output mapping profile to file')
  .option('-e, --entity-type <type>', 'Entity type to map', 'flights')
  .option('-f, --format <format>', 'Specify input format (csv|json|xlsx)')
  .option('--list', 'List available mapping profiles')
  .action(async (file, options) => {
    try {
      // If --list is specified, just list profiles and exit
      if (options.list) {
        const profiles = dataMapper.listMappingProfiles();
        
        if (profiles.length === 0) {
          console.log(chalk.yellow('No saved mapping profiles found'));
        } else {
          console.log(chalk.bold('Available mapping profiles:'));
          profiles.forEach(profile => {
            console.log(`- ${chalk.cyan(profile.name)} (${profile.entityType}, last used: ${new Date(profile.lastUsed).toLocaleString()})`);
          });
        }
        return;
      }
      
      // Check if file exists
      if (!fs.existsSync(file)) {
        console.error(chalk.red(`Error: File ${file} not found`));
        process.exit(1);
      }

      // Get file information
      const fileInfo = fileHandler.getFileStats(file);
      console.log(chalk.bold(`\nCreating mapping profile for: ${fileInfo.name}`));
      
      // Detect file format if not specified
      const format = options.format || fileHandler.detectFileFormat(file);
      console.log(`File format: ${chalk.cyan(format.toUpperCase())}`);
      
      // Parse the file to get sample data
      console.log('Parsing file for field detection...');
      const rawData = await fileHandler.parseFile(file, format);
      console.log(`Found ${chalk.cyan(rawData.length)} records`);

      // Get the source fields from the first record
      const sourceFields = rawData.length > 0 ? Object.keys(rawData[0]) : [];
      console.log(`Found ${chalk.cyan(sourceFields.length)} fields: ${sourceFields.join(', ')}`);
      
      // Show sample data
      const sampleData = fileHandler.getSampleRecords(rawData, 2);
      console.log(chalk.bold('\nSample data:'));
      console.table(sampleData);
      
      // Handle interactive mapping
      console.log(chalk.bold('\nColumn Mapping'));
      const mappingProfile = await promptsManager.handleMappingPrompts(sourceFields, options.entityType);
      
      // Show mapping summary
      console.log(chalk.bold('\nMapping Summary:'));
      Object.entries(mappingProfile.mappings).forEach(([target, source]) => {
        if (source) {
          console.log(`  ${chalk.green('✓')} ${target} ⟵ ${source}`);
        } else {
          console.log(`  ${chalk.red('✗')} ${target} ⟵ (unmapped)`);
        }
      });
      
      // Check if validation should be tested with this mapping
      const { testValidation } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'testValidation',
          message: 'Would you like to test validation with this mapping?',
          default: true
        }
      ]);
      
      if (testValidation) {
        // Apply mapping and validate
        console.log('\nApplying mapping and testing validation...');
        const mappedData = dataMapper.applyMapping(rawData, mappingProfile);
        
        // Basic schema validation
        const validationResults = validator.validateSchema(mappedData, options.entityType);
        
        // Display validation preview
        if (validationResults.isValid) {
          console.log(chalk.green('\n✓ Schema validation passed!'));
        } else {
          console.log(chalk.red(`\n✗ Schema validation failed with ${validationResults.errors.length} errors`));
          validationResults.errors.slice(0, 5).forEach(error => {
            console.log(`  - ${error.message} (${error.field}, record: ${error.recordId})`);
          });
        }
      }
      
      // Get profile name
      const { profileName } = await inquirer.prompt([
        {
          type: 'input',
          name: 'profileName',
          message: 'Enter a name for this mapping profile:',
          default: `${options.entityType}-mapping-${new Date().toISOString().split('T')[0]}`,
          validate: input => input.trim() !== '' ? true : 'Profile name cannot be empty'
        }
      ]);
      
      // Save mapping profile
      mappingProfile.profileName = profileName;
      
      // Determine where to save
      if (options.output) {
        // Save to specified file
        fs.writeFileSync(options.output, JSON.stringify(mappingProfile, null, 2));
        console.log(chalk.green(`\nMapping profile saved to: ${options.output}`));
      } else {
        // Save to user profiles
        const savedPath = dataMapper.saveMappingProfile(profileName, mappingProfile);
        console.log(chalk.green(`\nMapping profile '${profileName}' saved to: ${savedPath}`));
      }
      
    } catch (error) {
      console.error(chalk.red(`Error creating mapping: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Reference Command
 * Manages reference data
 */
program
  .command('reference')
  .description('Manage reference data')
  .option('--create <type>', 'Create sample reference data file (airlines, aircraftTypes, terminals)')
  .option('-o, --output <dir>', 'Output directory for reference data files', './reference-data')
  .action(async (options) => {
    try {
      if (options.create) {
        // Create sample reference data
        const type = options.create;
        if (!['airlines', 'aircraftTypes', 'terminals'].includes(type)) {
          console.error(chalk.red(`Error: Invalid reference data type: ${type}`));
          console.log('Valid types: airlines, aircraftTypes, terminals');
          process.exit(1);
        }
        
        // Create output directory if it doesn't exist
        if (!fs.existsSync(options.output)) {
          fs.mkdirSync(options.output, { recursive: true });
        }
        
        // Create sample data file
        const outputPath = path.join(options.output, `${type}.json`);
        const createdPath = referenceData.createSampleReferenceData(type, outputPath);
        
        console.log(chalk.green(`Sample ${type} reference data created at: ${createdPath}`));
      } else {
        console.log('Use --create <type> to create sample reference data');
        console.log('Valid types: airlines, aircraftTypes, terminals');
      }
    } catch (error) {
      console.error(chalk.red(`Error managing reference data: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Config Command
 * Manages configuration settings
 */
program
  .command('config')
  .description('Manage configuration settings')
  .option('--show', 'Show current configuration')
  .option('--reset', 'Reset configuration to defaults')
  .option('--set <key=value>', 'Set configuration value')
  .action(async (options) => {
    try {
      if (options.show) {
        // Show current configuration
        const config = configManager.loadConfig();
        console.log(chalk.bold('Current Configuration:'));
        console.log(JSON.stringify(config, null, 2));
      } else if (options.reset) {
        // Reset configuration
        const config = configManager.resetConfig();
        console.log(chalk.green('Configuration reset to defaults'));
      } else if (options.set) {
        // Set configuration value
        const [key, value] = options.set.split('=');
        if (!key || value === undefined) {
          console.error(chalk.red('Error: Invalid format. Use --set key=value'));
          process.exit(1);
        }
        
        // Parse value
        let parsedValue;
        try {
          // Try to parse JSON
          parsedValue = JSON.parse(value);
        } catch (e) {
          // If not valid JSON, use string value
          parsedValue = value;
        }
        
        // Create update object
        const keys = key.split('.');
        const updates = {};
        let current = updates;
        
        keys.forEach((k, i) => {
          if (i === keys.length - 1) {
            current[k] = parsedValue;
          } else {
            current[k] = {};
            current = current[k];
          }
        });
        
        // Update config
        const config = configManager.updateConfig(updates);
        console.log(chalk.green(`Configuration updated: ${key} = ${JSON.stringify(parsedValue)}`));
      } else {
        console.log('Use --show to display configuration');
        console.log('Use --reset to reset configuration to defaults');
        console.log('Use --set key=value to set configuration values');
      }
    } catch (error) {
      console.error(chalk.red(`Error managing configuration: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Export JSON Command
 * Exports validated data to Stand Allocation compatible JSON format
 */
program
  .command('export-json <file>')
  .description('Export validated data to Stand Allocation compatible JSON format')
  .option('-o, --output <dir>', 'Output directory for JSON files', './allocation-input')
  .option('-m, --mapping <profile>', 'Use a saved mapping profile')
  .option('-f, --format <format>', 'Specify input format (csv|json|xlsx)')
  .option('-r, --reference-data <dir>', 'Directory containing reference data files')
  .option('-s, --settings <file>', 'JSON file with settings data')
  .option('-i, --interactive', 'Run in interactive mode to customize export', false)
  .action(async (file, options) => {
    try {
      // Check if file exists
      if (!fs.existsSync(file)) {
        console.error(chalk.red(`Error: File ${file} not found`));
        process.exit(1);
      }

      // Get file information
      const fileInfo = fileHandler.getFileStats(file);
      console.log(chalk.bold(`\nExporting file to Stand Allocation format: ${fileInfo.name} (${fileInfo.sizeFormatted})`));
      
      // Detect file format if not specified
      const format = options.format || fileHandler.detectFileFormat(file);
      console.log(`File format: ${chalk.cyan(format.toUpperCase())}`);
      
      // Parse the file
      console.log('Parsing file...');
      let rawData = await fileHandler.parseFile(file, format);
      console.log(`Found ${chalk.cyan(rawData.length)} records`);
      
      // If the file is already in JSON format and has expected Stand Allocation structure,
      // we can use it directly without mapping
      const isStandAllocationFormat = rawData.length > 0 && 
        ['FlightID', 'FlightNumber', 'AirlineCode', 'IsArrival'].every(field => 
          Object.keys(rawData[0]).includes(field));
      
      let mappedData = rawData;
      
      if (!isStandAllocationFormat) {
        // Get the source fields from the first record
        const sourceFields = rawData.length > 0 ? Object.keys(rawData[0]) : [];
        
        let mappingProfile;
        
        // Handle mapping
        if (options.mapping) {
          // Use saved mapping profile
          console.log(`Using mapping profile: ${chalk.cyan(options.mapping)}`);
          try {
            mappingProfile = dataMapper.loadMappingProfile(options.mapping);
          } catch (error) {
            console.error(chalk.red(`Error loading mapping profile: ${error.message}`));
            process.exit(1);
          }
        } else {
          // Auto-mapping
          console.log('Attempting automatic field mapping...');
          const targetFields = dataMapper.getMappingFields('flights');
          const suggestedMappings = dataMapper.generateMappingSuggestions(sourceFields, targetFields);
          
          mappingProfile = {
            profileName: 'auto-mapping',
            entityType: 'flights',
            lastUsed: new Date().toISOString(),
            mappings: suggestedMappings,
            transformations: {
              ScheduledTime: 'convertDateTime',
              IsArrival: 'stringToBoolean'
            }
          };
          
          console.log('Auto-mapped fields:');
          Object.entries(suggestedMappings).forEach(([target, source]) => {
            if (source) {
              console.log(`  ${chalk.green('✓')} ${target} ⟵ ${source}`);
            } else {
              console.log(`  ${chalk.red('✗')} ${target} ⟵ (unmapped)`);
            }
          });
        }
        
        // Apply mapping
        console.log('\nApplying column mapping...');
        mappedData = dataMapper.applyMapping(rawData, mappingProfile);
      }
      
      // Load reference data if provided
      let refData;
      if (options.referenceData) {
        console.log(`\nLoading reference data from ${options.referenceData}...`);
        try {
          refData = await referenceData.loadAllReferenceData(options.referenceData);
        } catch (error) {
          console.warn(chalk.yellow(`Warning: ${error.message}`));
          console.log('Continuing without reference data');
        }
      }
      
      // Load settings if provided
      let settingsData = {};
      if (options.settings && fs.existsSync(options.settings)) {
        try {
          settingsData = JSON.parse(fs.readFileSync(options.settings, 'utf8'));
          console.log('Loaded custom settings');
        } catch (error) {
          console.warn(chalk.yellow(`Warning: Could not load settings file: ${error.message}`));
          console.log('Using default settings');
        }
      }
      
      // Configure export options
      const exportOptions = {
        referenceData: refData,
        settings: settingsData,
        flightData: mappedData
      };
      
      // Convert to Stand Allocation format
      console.log('\nConverting data to Stand Allocation format...');
      const formattedData = jsonFormatter.convertToStandAllocationFormat(mappedData, exportOptions);
      
      // Export to JSON files
      console.log(`Exporting JSON files to ${options.output}...`);
      const filePaths = jsonFormatter.exportToJsonFiles(formattedData, options.output);
      
      // Display export results
      console.log(chalk.green('\nExport completed successfully!'));
      console.log('Generated files:');
      Object.entries(filePaths).forEach(([type, path]) => {
        console.log(`- ${chalk.cyan(type)}: ${path}`);
      });
      
    } catch (error) {
      console.error(chalk.red(`Error during export: ${error.message}`));
      if (options.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

/**
 * Validate and Export Command
 * Validates data and exports to Stand Allocation format in one step
 */
program
  .command('validate-export <file>')
  .description('Validate data and export to Stand Allocation format')
  .option('-o, --output <dir>', 'Output directory for JSON files', './allocation-input')
  .option('-m, --mapping <profile>', 'Use a saved mapping profile')
  .option('-f, --format <format>', 'Specify input format (csv|json|xlsx)')
  .option('-r, --reference-data <dir>', 'Directory containing reference data files')
  .option('-s, --settings <file>', 'JSON file with settings data')
  .option('-i, --interactive', 'Run in interactive mode', true)
  .option('-v, --verbose', 'Show detailed validation information')
  .option('--no-color', 'Disable colored output')
  .option('--skip-invalid', 'Export even if validation fails', false)
  .action(async (file, options) => {
    try {
      // Check if file exists
      if (!fs.existsSync(file)) {
        console.error(chalk.red(`Error: File ${file} not found`));
        process.exit(1);
      }

      // Load config
      const config = configManager.loadConfig();
      
      // Get file information
      const fileInfo = fileHandler.getFileStats(file);
      console.log(chalk.bold(`\nValidating and exporting file: ${fileInfo.name} (${fileInfo.sizeFormatted})`));
      
      // Detect file format if not specified
      const format = options.format || fileHandler.detectFileFormat(file);
      console.log(`File format: ${chalk.cyan(format.toUpperCase())}`);
      
      // Parse the file
      console.log('Parsing file...');
      const rawData = await fileHandler.parseFile(file, format);
      console.log(`Found ${chalk.cyan(rawData.length)} records`);

      // Get the source fields from the first record
      const sourceFields = rawData.length > 0 ? Object.keys(rawData[0]) : [];
      
      let mappedData;
      let mappingProfile;
      
      // Handle mapping
      if (options.mapping) {
        // Use saved mapping profile
        console.log(`Using mapping profile: ${chalk.cyan(options.mapping)}`);
        try {
          mappingProfile = dataMapper.loadMappingProfile(options.mapping);
        } catch (error) {
          console.error(chalk.red(`Error loading mapping profile: ${error.message}`));
          process.exit(1);
        }
      } else if (options.interactive) {
        // Interactive mapping
        console.log(chalk.bold('\nColumn Mapping'));
        mappingProfile = await promptsManager.handleMappingPrompts(sourceFields, 'flights');
      } else {
        // Auto-mapping
        console.log('Attempting automatic field mapping...');
        const targetFields = dataMapper.getMappingFields('flights');
        const suggestedMappings = dataMapper.generateMappingSuggestions(sourceFields, targetFields);
        
        mappingProfile = {
          profileName: 'auto-mapping',
          entityType: 'flights',
          lastUsed: new Date().toISOString(),
          mappings: suggestedMappings,
          transformations: {
            ScheduledTime: 'convertDateTime',
            IsArrival: 'stringToBoolean'
          }
        };
        
        console.log('Auto-mapped fields:');
        Object.entries(suggestedMappings).forEach(([target, source]) => {
          if (source) {
            console.log(`  ${chalk.green('✓')} ${target} ⟵ ${source}`);
          } else {
            console.log(`  ${chalk.red('✗')} ${target} ⟵ (unmapped)`);
          }
        });
      }
      
      // Apply mapping
      console.log('\nApplying column mapping...');
      mappedData = dataMapper.applyMapping(rawData, mappingProfile);
      
      // Load reference data if provided
      let refData;
      if (options.referenceData) {
        console.log(`\nLoading reference data from ${options.referenceData}...`);
        try {
          refData = await referenceData.loadAllReferenceData(options.referenceData);
        } catch (error) {
          console.warn(chalk.yellow(`Warning: ${error.message}`));
          console.log('Continuing without reference data validation');
        }
      }
      
      // Perform validation
      console.log(chalk.bold('\nValidating data...'));
      const validationStartTime = Date.now();
      
      // Basic schema validation first
      const schemaResults = validator.validateSchema(mappedData, 'flights');
      
      // Reference data validation if available
      let integrityResults = { errors: [], warnings: [] };
      if (refData) {
        integrityResults = validator.validateDataIntegrity(mappedData, refData);
      }
      
      // Business rules validation
      const businessRuleSettings = {
        minTurnaroundMinutes: config.validation.minTurnaroundMinutes,
        minTransferMinutes: config.validation.minTransferMinutes,
        maxTransferMinutes: config.validation.maxTransferMinutes
      };
      const businessResults = validator.validateBusinessRules(mappedData, businessRuleSettings);
      
      // Combine results
      const combinedResults = {
        isValid: schemaResults.isValid && integrityResults.isValid && businessResults.isValid,
        errors: [...schemaResults.errors, ...integrityResults.errors, ...businessResults.errors],
        warnings: [...schemaResults.warnings, ...integrityResults.warnings, ...businessResults.warnings]
      };
      
      const validationEndTime = Date.now();
      const validationTime = (validationEndTime - validationStartTime) / 1000;
      console.log(`Validation completed in ${validationTime.toFixed(2)} seconds`);
      
      // Generate report
      const report = reportGenerator.generateValidationReport(combinedResults, {
        filename: fileInfo.name,
        recordCount: mappedData.length,
        entityType: 'flights',
        includeDetailedErrors: true,
        includeWarnings: true
      });
      
      // Display results
      const displayOptions = {
        colorize: options.color,
        detailedErrors: options.verbose ? 50 : 5,
        detailedWarnings: options.verbose ? 50 : 5,
        showSummary: true
      };
      
      console.log(reportGenerator.formatReportForDisplay(report, displayOptions));
      
      // Check if we should export despite validation errors
      if (!report.isValid && !options.skipInvalid) {
        console.log(chalk.yellow('\nValidation failed. Use --skip-invalid to export anyway.'));
        process.exit(1);
      }
      
      // Load settings if provided
      let settingsData = {};
      if (options.settings && fs.existsSync(options.settings)) {
        try {
          settingsData = JSON.parse(fs.readFileSync(options.settings, 'utf8'));
          console.log('Loaded custom settings');
        } catch (error) {
          console.warn(chalk.yellow(`Warning: Could not load settings file: ${error.message}`));
          console.log('Using default settings');
        }
      }
      
      // Configure export options
      const exportOptions = {
        referenceData: refData,
        settings: settingsData,
        flightData: mappedData
      };
      
      // Convert to Stand Allocation format
      console.log('\nConverting data to Stand Allocation format...');
      const formattedData = jsonFormatter.convertToStandAllocationFormat(mappedData, exportOptions);
      
      // Export to JSON files
      console.log(`Exporting JSON files to ${options.output}...`);
      const filePaths = jsonFormatter.exportToJsonFiles(formattedData, options.output);
      
      // Display export results
      console.log(chalk.green('\nExport completed successfully!'));
      console.log('Generated files:');
      Object.entries(filePaths).forEach(([type, path]) => {
        console.log(`- ${chalk.cyan(type)}: ${path}`);
      });
      
    } catch (error) {
      console.error(chalk.red(`Error during validation and export: ${error.message}`));
      if (options.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  });

/**
 * Batch Process Command
 * Process multiple files in a directory
 */
program
  .command('batch-process <directory>')
  .description('Process multiple files in a directory')
  .option('-o, --output <dir>', 'Output directory for processed files', './allocation-outputs')
  .option('-m, --mapping <profile>', 'Use a saved mapping profile')
  .option('-r, --reference-data <dir>', 'Directory containing reference data files')
  .option('-p, --pattern <pattern>', 'File pattern to match (e.g., "*.csv")', '*.csv')
  .option('--validate', 'Validate files before export', true)
  .option('--skip-invalid', 'Skip invalid files instead of stopping', false)
  .action(async (directory, options) => {
    try {
      // Check if directory exists
      if (!fs.existsSync(directory)) {
        console.error(chalk.red(`Error: Directory ${directory} not found`));
        process.exit(1);
      }
      
      console.log(chalk.bold(`\nBatch processing files in ${directory}`));
      
      // Get all files matching the pattern
      const glob = require('glob');
      const files = glob.sync(path.join(directory, options.pattern));
      
      if (files.length === 0) {
        console.log(chalk.yellow(`No files matching ${options.pattern} found in ${directory}`));
        process.exit(0);
      }
      
      console.log(`Found ${chalk.cyan(files.length)} files to process`);
      
      // Create output directory if it doesn't exist
      if (!fs.existsSync(options.output)) {
        fs.mkdirSync(options.output, { recursive: true });
      }
      
      // Load reference data if provided
      let refData;
      if (options.referenceData) {
        console.log(`\nLoading reference data from ${options.referenceData}...`);
        try {
          refData = await referenceData.loadAllReferenceData(options.referenceData);
        } catch (error) {
          console.warn(chalk.yellow(`Warning: ${error.message}`));
          console.log('Continuing without reference data');
        }
      }
      
      // Process each file
      const results = {
        total: files.length,
        successful: 0,
        failed: 0,
        skipped: 0
      };
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = path.basename(file);
        console.log(chalk.bold(`\n[${i+1}/${files.length}] Processing ${fileName}`));
        
        try {
          // Create output subdirectory for this file
          const fileOutputDir = path.join(options.output, path.basename(fileName, path.extname(fileName)));
          if (!fs.existsSync(fileOutputDir)) {
            fs.mkdirSync(fileOutputDir, { recursive: true });
          }
          
          // Detect file format
          const format = fileHandler.detectFileFormat(file);
          console.log(`File format: ${chalk.cyan(format.toUpperCase())}`);
          
          // Parse the file
          console.log('Parsing file...');
          const rawData = await fileHandler.parseFile(file, format);
          console.log(`Found ${chalk.cyan(rawData.length)} records`);
          
          if (rawData.length === 0) {
            console.log(chalk.yellow('File contains no records, skipping'));
            results.skipped++;
            continue;
          }
          
          // Get the source fields from the first record
          const sourceFields = Object.keys(rawData[0]);
          
          let mappedData;
          let mappingProfile;
          
          // Handle mapping
          if (options.mapping) {
            // Use saved mapping profile
            console.log(`Using mapping profile: ${chalk.cyan(options.mapping)}`);
            try {
              mappingProfile = dataMapper.loadMappingProfile(options.mapping);
            } catch (error) {
              console.error(chalk.red(`Error loading mapping profile: ${error.message}`));
              results.failed++;
              continue;
            }
          } else {
            // Auto-mapping
            console.log('Attempting automatic field mapping...');
            const targetFields = dataMapper.getMappingFields('flights');
            const suggestedMappings = dataMapper.generateMappingSuggestions(sourceFields, targetFields);
            
            mappingProfile = {
              profileName: 'auto-mapping',
              entityType: 'flights',
              lastUsed: new Date().toISOString(),
              mappings: suggestedMappings,
              transformations: {
                ScheduledTime: 'convertDateTime',
                IsArrival: 'stringToBoolean'
              }
            };
          }
          
          // Apply mapping
          console.log('Applying column mapping...');
          mappedData = dataMapper.applyMapping(rawData, mappingProfile);
          
          // Validate if required
          if (options.validate) {
            console.log('Validating data...');
            const validationResults = validator.validateSchema(mappedData, 'flights');
            
            if (!validationResults.isValid) {
              console.log(chalk.yellow(`Validation failed with ${validationResults.errors.length} errors`));
              
              if (!options.skipInvalid) {
                console.log(chalk.red('Skipping file due to validation errors'));
                results.failed++;
                continue;
              }
            }
          }
          
          // Configure export options
          const exportOptions = {
            referenceData: refData,
            flightData: mappedData
          };
          
          // Convert to Stand Allocation format
          console.log('Converting data to Stand Allocation format...');
          const formattedData = jsonFormatter.convertToStandAllocationFormat(mappedData, exportOptions);
          
          // Export to JSON files
          console.log(`Exporting JSON files to ${fileOutputDir}...`);
          const filePaths = jsonFormatter.exportToJsonFiles(formattedData, fileOutputDir);
          
          console.log(chalk.green('Export completed successfully!'));
          results.successful++;
          
        } catch (error) {
          console.error(chalk.red(`Error processing ${fileName}: ${error.message}`));
          results.failed++;
        }
      }
      
      // Display summary
      console.log(chalk.bold('\nBatch Processing Summary:'));
      console.log(`Total files: ${results.total}`);
      console.log(`Successfully processed: ${chalk.green(results.successful)}`);
      console.log(`Failed: ${results.failed > 0 ? chalk.red(results.failed) : results.failed}`);
      console.log(`Skipped: ${results.skipped > 0 ? chalk.yellow(results.skipped) : results.skipped}`);
      
      if (results.successful > 0) {
        console.log(chalk.green(`\nOutput files are available in: ${options.output}`));
      }
      
    } catch (error) {
      console.error(chalk.red(`Error during batch processing: ${error.message}`));
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// If no command is provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
} 