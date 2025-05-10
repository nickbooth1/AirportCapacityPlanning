#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { 
  loadForecastParameters,
  loadInfrastructureChanges,
  loadHistoricalCapacityData,
  loadStandData,
  loadAircraftTypeData,
  loadAirlineGrowthProjections,
  loadMarketForecasts,
  loadOperationalSettings
} from './services/dataLoader';
import { forecastCapacity } from './services/capacityForecaster';
import { analyzeCapacityGap } from './services/gapAnalyzer';
import { generateMitigationStrategies } from './services/mitigationGenerator';
import {
  ForecastParameters,
  InfrastructureChange,
  HistoricalCapacityData,
  StandData,
  AircraftTypeData,
  AirlineGrowthProjection,
  MarketForecast,
  OperationalSettings,
  DemandProjection,
  CapacityForecast,
  CapacityGapAnalysis,
  MitigationStrategy
} from './models/types';

const program = new Command();

// Setup CLI program info
program
  .name('standcapacity-forecast')
  .description('Stand Capacity Forecast Tool')
  .version('1.0.0');

// Add forecast command
program
  .command('forecast')
  .description('Generate capacity forecasts')
  .requiredOption('--historical <path>', 'Path to historical capacity data JSON file')
  .requiredOption('--infrastructure <path>', 'Path to infrastructure changes JSON file')
  .requiredOption('--stands <path>', 'Path to stand data JSON file')
  .requiredOption('--aircraft <path>', 'Path to aircraft type data JSON file')
  .requiredOption('--airlines <path>', 'Path to airline growth projections JSON file')
  .requiredOption('--markets <path>', 'Path to market forecasts JSON file')
  .requiredOption('--parameters <path>', 'Path to forecast parameters JSON file')
  .requiredOption('--settings <path>', 'Path to operational settings JSON file')
  .option('--output <directory>', 'Output directory for forecast results', './forecasts')
  .option('--scenario <name>', 'Specific scenario to forecast', 'all')
  .option('--time-horizon <years>', 'Number of years to forecast (overrides parameters file)')
  .action(async (options) => {
    try {
      // Create output directory if it doesn't exist
      await fs.ensureDir(options.output);
      
      // Load input data
      console.log('Loading data...');
      const historicalData = await loadHistoricalCapacityData(options.historical);
      const infrastructureChanges = await loadInfrastructureChanges(options.infrastructure);
      const stands = await loadStandData(options.stands);
      const aircraftTypes = await loadAircraftTypeData(options.aircraft);
      const airlineGrowth = await loadAirlineGrowthProjections(options.airlines);
      const marketForecasts = await loadMarketForecasts(options.markets);
      const parameters = await loadForecastParameters(options.parameters);
      const operationalSettings = await loadOperationalSettings(options.settings);
      
      console.log(`Loaded ${historicalData.length} historical records, ${stands.length} stands, ${airlineGrowth.length} airline projections`);
      
      // Override time horizon if specified
      if (options.timeHorizon) {
        parameters.timeHorizon = parseInt(options.timeHorizon, 10);
        console.log(`Overriding time horizon to ${parameters.timeHorizon} years`);
      }
      
      // Generate capacity forecast
      console.log('Generating capacity forecast...');
      const capacityForecasts = forecastCapacity(
        historicalData,
        infrastructureChanges,
        stands,
        aircraftTypes,
        airlineGrowth,
        marketForecasts,
        parameters,
        operationalSettings
      );
      
      // Output forecast results
      const forecastOutputPath = path.join(options.output, 'capacity_forecast.json');
      await fs.writeJSON(forecastOutputPath, capacityForecasts, { spaces: 2 });
      console.log(`Forecast complete. Generated ${capacityForecasts.length} forecast entries.`);
      console.log(`Results saved to: ${forecastOutputPath}`);
      
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('An unknown error occurred');
      }
      process.exit(1);
    }
  });

// Add analyze-gap command
program
  .command('analyze-gap')
  .description('Analyze capacity gaps between forecasts and demand projections')
  .requiredOption('--forecast <path>', 'Path to capacity forecast JSON file')
  .requiredOption('--demand <path>', 'Path to demand projections JSON file')
  .option('--output <directory>', 'Output directory for analysis results', './analysis')
  .option('--scenario <name>', 'Specific scenario to analyze', 'all')
  .action(async (options) => {
    try {
      // Create output directory if it doesn't exist
      await fs.ensureDir(options.output);
      
      // Load input data
      console.log('Loading data...');
      const capacityForecasts: CapacityForecast[] = await fs.readJSON(options.forecast);
      const demandProjections: DemandProjection[] = await fs.readJSON(options.demand);
      
      console.log(`Loaded ${capacityForecasts.length} forecast entries and ${demandProjections.length} demand projections`);
      
      // Filter by scenario if specified
      let filteredDemand = demandProjections;
      if (options.scenario !== 'all') {
        filteredDemand = demandProjections.filter(p => p.scenarioName === options.scenario);
        console.log(`Filtered to ${filteredDemand.length} demand projections for scenario: ${options.scenario}`);
      }
      
      // Analyze capacity gaps
      console.log('Analyzing capacity gaps...');
      const gapAnalyses = analyzeCapacityGap(capacityForecasts, filteredDemand);
      
      // Output analysis results
      const analysisOutputPath = path.join(options.output, 'capacity_gap_analysis.json');
      await fs.writeJSON(analysisOutputPath, gapAnalyses, { spaces: 2 });
      console.log(`Gap analysis complete. Generated ${gapAnalyses.length} gap analyses.`);
      console.log(`Results saved to: ${analysisOutputPath}`);
      
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('An unknown error occurred');
      }
      process.exit(1);
    }
  });

// Add generate-strategy command
program
  .command('generate-strategy')
  .description('Generate mitigation strategies for capacity gaps')
  .requiredOption('--gap-analysis <path>', 'Path to capacity gap analysis JSON file')
  .option('--output <directory>', 'Output directory for strategies', './strategies')
  .action(async (options) => {
    try {
      // Create output directory if it doesn't exist
      await fs.ensureDir(options.output);
      
      // Load input data
      console.log('Loading gap analysis data...');
      const gapAnalyses: CapacityGapAnalysis[] = await fs.readJSON(options.gapAnalysis);
      
      console.log(`Loaded ${gapAnalyses.length} gap analyses`);
      
      // Generate mitigation strategies
      console.log('Generating mitigation strategies...');
      const strategies = generateMitigationStrategies(gapAnalyses);
      
      // Output strategy results
      const strategiesOutputPath = path.join(options.output, 'mitigation_strategies.json');
      await fs.writeJSON(strategiesOutputPath, strategies, { spaces: 2 });
      console.log(`Strategy generation complete. Generated ${strategies.length} strategies.`);
      console.log(`Results saved to: ${strategiesOutputPath}`);
      
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('An unknown error occurred');
      }
      process.exit(1);
    }
  });

// Add sensitivity command (simplified implementation)
program
  .command('sensitivity')
  .description('Perform sensitivity analysis on forecast parameters')
  .requiredOption('--forecast <path>', 'Path to capacity forecast JSON file')
  .requiredOption('--parameters <path>', 'Path to forecast parameters JSON file')
  .requiredOption('--variables <list>', 'Comma-separated list of variables to analyze sensitivity for')
  .option('--output <directory>', 'Output directory for analysis results', './sensitivity')
  .action(async (options) => {
    try {
      // Create output directory if it doesn't exist
      await fs.ensureDir(options.output);
      
      console.log('Sensitivity analysis is not fully implemented in this version.');
      console.log(`Would analyze sensitivity for variables: ${options.variables}`);
      
      // Placeholder for sensitivity analysis implementation
      const sensitivityResults = {
        analyzed_variables: options.variables.split(','),
        parameters_file: options.parameters,
        forecast_file: options.forecast,
        results: "Sensitivity analysis not fully implemented in this version."
      };
      
      // Output sensitivity results
      const sensitivityOutputPath = path.join(options.output, 'sensitivity_analysis.json');
      await fs.writeJSON(sensitivityOutputPath, sensitivityResults, { spaces: 2 });
      console.log(`Results saved to: ${sensitivityOutputPath}`);
      
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('An unknown error occurred');
      }
      process.exit(1);
    }
  });

// Add visualize command (simplified implementation)
program
  .command('visualize')
  .description('Generate visualizations from forecast results')
  .requiredOption('--forecast <path>', 'Path to capacity forecast JSON file or directory')
  .option('--type <type>', 'Type of visualization: capacity-evolution, capacity-demand, gap-analysis', 'capacity-evolution')
  .option('--output <directory>', 'Output directory for visualizations', './visuals')
  .action(async (options) => {
    try {
      // Create output directory if it doesn't exist
      await fs.ensureDir(options.output);
      
      console.log('Visualization capability is not fully implemented in this version.');
      console.log(`Would create ${options.type} visualization from ${options.forecast}`);
      
      // Placeholder for visualization implementation
      const visualizationResults = {
        visualization_type: options.type,
        data_source: options.forecast,
        output_directory: options.output,
        results: "Visualization not fully implemented in this version."
      };
      
      // Output visualization meta information
      const visualMeta = path.join(options.output, 'visualization_info.json');
      await fs.writeJSON(visualMeta, visualizationResults, { spaces: 2 });
      console.log(`Results saved to: ${visualMeta}`);
      
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('An unknown error occurred');
      }
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// If no arguments provided, show help
if (process.argv.length < 3) {
  program.outputHelp();
} 