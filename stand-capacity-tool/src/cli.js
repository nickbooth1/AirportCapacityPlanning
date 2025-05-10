#!/usr/bin/env node

/**
 * Command-line interface for Stand Capacity Tool
 */
const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs-extra');
const { table } = require('table');
const capacityService = require('./services/capacityService');
const packageInfo = require('../package.json');

// Configure CLI
program
  .name('stand-capacity-tool')
  .description('CLI tool to calculate airport stand capacity by aircraft type and time slot')
  .version(packageInfo.version);

// Initialize command - generates sample data
program
  .command('init')
  .description('Initialize with sample data')
  .option('--sample-data', 'Generate sample data files')
  .option('--output-dir <path>', 'Output directory for sample files', './data')
  .action(async (options) => {
    try {
      const spinner = ora('Generating sample data...').start();
      
      const outputDir = path.resolve(options.outputDir);
      const samplePaths = await capacityService.generateSampleData(outputDir);
      
      spinner.succeed('Sample data generated successfully');
      
      console.log('\nSample files created:');
      console.log(chalk.green(`- Operational Settings: ${samplePaths.operationalSettingsPath}`));
      console.log(chalk.green(`- Aircraft Types: ${samplePaths.aircraftTypesPath}`));
      console.log(chalk.green(`- Stands: ${samplePaths.standsPath}`));
      console.log(chalk.green(`- Adjacency Rules: ${samplePaths.adjacencyRulesPath}`));
      
      console.log('\nYou can now run a calculation using:');
      console.log(chalk.blue(`stand-capacity-tool calculate --stands ${samplePaths.standsPath} \\
  --aircraft ${samplePaths.aircraftTypesPath} \\
  --settings ${samplePaths.operationalSettingsPath} \\
  --adjacency-rules ${samplePaths.adjacencyRulesPath}`));
    } catch (error) {
      ora().fail(chalk.red(`Failed to generate sample data: ${error.message}`));
      process.exit(1);
    }
  });

// Calculate command - performs capacity calculation
program
  .command('calculate')
  .description('Calculate stand capacity')
  .requiredOption('--stands <path>', 'Path to stands JSON file')
  .requiredOption('--aircraft <path>', 'Path to aircraft types JSON file')
  .option('--settings <path>', 'Path to operational settings JSON file')
  .option('--adjacency-rules <path>', 'Path to adjacency rules JSON file')
  .option('--output <format>', 'Output format (table, json, csv)', 'table')
  .option('--out-file <path>', 'Output file path (if not specified, prints to console)')
  .action(async (options) => {
    try {
      const spinner = ora('Calculating stand capacity...').start();
      
      const result = await capacityService.calculateFromFiles({
        standsFilePath: options.stands,
        aircraftTypesFilePath: options.aircraft,
        settingsFilePath: options.settings,
        adjacencyRulesFilePath: options.adjacencyRules
      });
      
      spinner.succeed('Capacity calculation completed successfully');
      
      // Format the output based on the selected format
      let output;
      switch (options.output.toLowerCase()) {
        case 'json':
          output = JSON.stringify(result.toJson(), null, 2);
          break;
          
        case 'csv':
          output = formatCsv(result);
          break;
          
        case 'table':
        default:
          output = formatTable(result);
          break;
      }
      
      // Output to file or console
      if (options.outFile) {
        const outPath = path.resolve(options.outFile);
        await fs.writeFile(outPath, output);
        console.log(chalk.green(`Output written to ${outPath}`));
      } else {
        console.log('\n' + output);
      }
    } catch (error) {
      ora().fail(chalk.red(`Calculation failed: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Formats capacity result as a table
 * @param {CapacityResult} result - Capacity result
 * @returns {string} Formatted table
 */
function formatTable(result) {
  const tableData = result.toTable();
  
  let output = '';
  
  // Best case table
  output += chalk.bold.green('Best Case Capacity (No Adjacency Restrictions):\n');
  const bestCaseData = [tableData.headers, ...tableData.bestCase];
  output += table(bestCaseData);
  
  // Worst case table
  output += chalk.bold.yellow('Worst Case Capacity (Most Restrictive Adjacency Rules Applied):\n');
  const worstCaseData = [tableData.headers, ...tableData.worstCase];
  output += table(worstCaseData);
  
  return output;
}

/**
 * Formats capacity result as CSV
 * @param {CapacityResult} result - Capacity result
 * @returns {string} CSV string
 */
function formatCsv(result) {
  const tableData = result.toTable();
  let output = '';
  
  // Best case CSV
  output += 'Best Case Capacity\n';
  output += tableData.headers.join(',') + '\n';
  tableData.bestCase.forEach(row => {
    output += row.join(',') + '\n';
  });
  
  // Worst case CSV
  output += '\nWorst Case Capacity\n';
  output += tableData.headers.join(',') + '\n';
  tableData.worstCase.forEach(row => {
    output += row.join(',') + '\n';
  });
  
  return output;
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error(chalk.red(`Error: ${error.message}`));
  process.exit(1);
});

// Parse command line arguments
program.parse(process.argv);

// If no arguments, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
} 