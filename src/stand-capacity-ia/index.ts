#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { 
  loadHistoricalFlightData, 
  loadStandData, 
  loadAircraftTypeData,
  loadStandAdjacencyRules,
  loadOperationalSettings
} from './services/dataLoader';
import { analyzeStandUtilization } from './services/utilizationAnalyzer';
import { analyzeAdjacencyImpact } from './services/adjacencyAnalyzer';
import { generateRecommendations } from './services/recommendationGenerator';
import { 
  HistoricalFlightData,
  StandData,
  AircraftTypeData,
  StandAdjacencyRule,
  OperationalSettings,
  StandUtilizationMetrics,
  AdjacencyImpactMetrics,
  OptimizationRecommendation
} from './models/types';

const program = new Command();

// Setup CLI program info
program
  .name('standcapacity-ia')
  .description('Stand Capacity Intelligent Analysis Tool')
  .version('1.0.0');

// Add analyze command
program
  .command('analyze')
  .description('Analyze historical stand usage data')
  .requiredOption('--flights <path>', 'Path to historical flight data JSON file')
  .requiredOption('--stands <path>', 'Path to stand data JSON file')
  .requiredOption('--aircraft <path>', 'Path to aircraft type data JSON file')
  .requiredOption('--adjacency <path>', 'Path to stand adjacency rules JSON file')
  .requiredOption('--settings <path>', 'Path to operational settings JSON file')
  .option('--output <directory>', 'Output directory for analysis results', './output')
  .option('--type <type>', 'Type of analysis to perform: utilization, adjacency, all', 'all')
  .action(async (options) => {
    try {
      // Create output directory if it doesn't exist
      await fs.ensureDir(options.output);
      
      // Load input data
      console.log('Loading data...');
      const flights = await loadHistoricalFlightData(options.flights);
      const stands = await loadStandData(options.stands);
      const aircraftTypes = await loadAircraftTypeData(options.aircraft);
      const adjacencyRules = await loadStandAdjacencyRules(options.adjacency);
      const operationalSettings = await loadOperationalSettings(options.settings);
      
      console.log(`Loaded ${flights.length} flights, ${stands.length} stands, ${aircraftTypes.length} aircraft types, and ${adjacencyRules.length} adjacency rules`);
      
      // Perform requested analyses
      const outputFiles: string[] = [];
      
      if (options.type === 'all' || options.type === 'utilization') {
        console.log('Analyzing stand utilization...');
        const utilizationMetrics = analyzeStandUtilization(flights, stands, operationalSettings);
        const utilizationOutputPath = path.join(options.output, 'utilization_metrics.json');
        await fs.writeJSON(utilizationOutputPath, utilizationMetrics, { spaces: 2 });
        outputFiles.push(utilizationOutputPath);
        console.log(`Utilization analysis complete. Generated ${utilizationMetrics.length} stand metrics.`);
      }
      
      if (options.type === 'all' || options.type === 'adjacency') {
        console.log('Analyzing adjacency impact...');
        const adjacencyMetrics = analyzeAdjacencyImpact(flights, adjacencyRules);
        const adjacencyOutputPath = path.join(options.output, 'adjacency_impact_metrics.json');
        await fs.writeJSON(adjacencyOutputPath, adjacencyMetrics, { spaces: 2 });
        outputFiles.push(adjacencyOutputPath);
        console.log(`Adjacency analysis complete. Generated ${adjacencyMetrics.length} impact metrics.`);
      }
      
      if (options.type === 'all') {
        console.log('Generating optimization recommendations...');
        
        // Load results if they weren't generated in this run
        let utilizationMetrics: StandUtilizationMetrics[] = [];
        let adjacencyMetrics: AdjacencyImpactMetrics[] = [];
        
        const utilizationPath = path.join(options.output, 'utilization_metrics.json');
        const adjacencyPath = path.join(options.output, 'adjacency_impact_metrics.json');
        
        if (await fs.pathExists(utilizationPath)) {
          utilizationMetrics = await fs.readJSON(utilizationPath);
        } else {
          utilizationMetrics = analyzeStandUtilization(flights, stands, operationalSettings);
        }
        
        if (await fs.pathExists(adjacencyPath)) {
          adjacencyMetrics = await fs.readJSON(adjacencyPath);
        } else {
          adjacencyMetrics = analyzeAdjacencyImpact(flights, adjacencyRules);
        }
        
        const recommendations = generateRecommendations(
          utilizationMetrics,
          adjacencyMetrics,
          stands,
          aircraftTypes
        );
        
        const recommendationsOutputPath = path.join(options.output, 'optimization_recommendations.json');
        await fs.writeJSON(recommendationsOutputPath, recommendations, { spaces: 2 });
        outputFiles.push(recommendationsOutputPath);
        console.log(`Recommendation generation complete. Generated ${recommendations.length} recommendations.`);
      }
      
      console.log('Analysis complete. Output files:');
      outputFiles.forEach(file => console.log(`- ${file}`));
      
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('An unknown error occurred');
      }
      process.exit(1);
    }
  });

// Add report command
program
  .command('report')
  .description('Generate formatted reports from analysis results')
  .requiredOption('--input <directory>', 'Input directory containing analysis results')
  .option('--output <directory>', 'Output directory for reports', './reports')
  .option('--format <format>', 'Report format: json, csv, text', 'text')
  .action(async (options) => {
    try {
      // Create output directory if it doesn't exist
      await fs.ensureDir(options.output);
      
      console.log('Generating reports...');
      
      // Check for available analysis files
      const utilizationPath = path.join(options.input, 'utilization_metrics.json');
      const adjacencyPath = path.join(options.input, 'adjacency_impact_metrics.json');
      const recommendationsPath = path.join(options.input, 'optimization_recommendations.json');
      
      let utilizationMetrics: StandUtilizationMetrics[] = [];
      let adjacencyMetrics: AdjacencyImpactMetrics[] = [];
      let recommendations: OptimizationRecommendation[] = [];
      
      if (await fs.pathExists(utilizationPath)) {
        utilizationMetrics = await fs.readJSON(utilizationPath);
        console.log(`Loaded ${utilizationMetrics.length} utilization metrics`);
        
        // Generate utilization report
        const utilizationReport = generateUtilizationReport(utilizationMetrics, options.format);
        const utilizationReportPath = path.join(
          options.output, 
          `utilization_report.${options.format === 'text' ? 'txt' : options.format}`
        );
        await fs.writeFile(utilizationReportPath, utilizationReport);
        console.log(`Generated utilization report: ${utilizationReportPath}`);
      }
      
      if (await fs.pathExists(adjacencyPath)) {
        adjacencyMetrics = await fs.readJSON(adjacencyPath);
        console.log(`Loaded ${adjacencyMetrics.length} adjacency impact metrics`);
        
        // Generate adjacency impact report
        const adjacencyReport = generateAdjacencyReport(adjacencyMetrics, options.format);
        const adjacencyReportPath = path.join(
          options.output, 
          `adjacency_impact_report.${options.format === 'text' ? 'txt' : options.format}`
        );
        await fs.writeFile(adjacencyReportPath, adjacencyReport);
        console.log(`Generated adjacency impact report: ${adjacencyReportPath}`);
      }
      
      if (await fs.pathExists(recommendationsPath)) {
        recommendations = await fs.readJSON(recommendationsPath);
        console.log(`Loaded ${recommendations.length} optimization recommendations`);
        
        // Generate recommendations report
        const recommendationsReport = generateRecommendationsReport(recommendations, options.format);
        const recommendationsReportPath = path.join(
          options.output, 
          `optimization_recommendations_report.${options.format === 'text' ? 'txt' : options.format}`
        );
        await fs.writeFile(recommendationsReportPath, recommendationsReport);
        console.log(`Generated recommendations report: ${recommendationsReportPath}`);
      }
      
      console.log('Report generation complete.');
      
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('An unknown error occurred');
      }
      process.exit(1);
    }
  });

// Helper function to generate utilization report in different formats
function generateUtilizationReport(metrics: StandUtilizationMetrics[], format: string): string {
  if (format === 'json') {
    return JSON.stringify(metrics, null, 2);
  } else if (format === 'csv') {
    // Simple CSV format
    const header = 'StandID,UtilizationRate,SuboptimalAllocations\n';
    const rows = metrics.map(m => `${m.standID},${m.utilizationRate},${m.suboptimalAllocationInstances}`).join('\n');
    return header + rows;
  } else {
    // Text format
    let report = 'STAND UTILIZATION REPORT\n';
    report += '=======================\n\n';
    
    metrics.forEach(m => {
      report += `Stand: ${m.standID}\n`;
      report += `Utilization Rate: ${(m.utilizationRate * 100).toFixed(2)}%\n`;
      report += `Peak Periods: ${m.peakUtilizationPeriods.length}\n`;
      report += `Idle Periods: ${m.idlePeriods.length}\n`;
      report += `Suboptimal Allocations: ${m.suboptimalAllocationInstances}\n`;
      report += '-------------------------------------------\n';
    });
    
    return report;
  }
}

// Helper function to generate adjacency impact report in different formats
function generateAdjacencyReport(metrics: AdjacencyImpactMetrics[], format: string): string {
  if (format === 'json') {
    return JSON.stringify(metrics, null, 2);
  } else if (format === 'csv') {
    // Simple CSV format
    const header = 'PrimaryStandID,AffectedStandID,OccurrenceCount,EstimatedLostCapacity,MostCommonTrigger\n';
    const rows = metrics.map(m => 
      `${m.primaryStandID},${m.affectedStandID},${m.occurrenceCount},${m.estimatedLostCapacity},${m.mostCommonTriggerAircraftType}`
    ).join('\n');
    return header + rows;
  } else {
    // Text format
    let report = 'ADJACENCY IMPACT REPORT\n';
    report += '=======================\n\n';
    
    metrics.forEach(m => {
      report += `Primary Stand: ${m.primaryStandID}, Affected Stand: ${m.affectedStandID}\n`;
      report += `Occurrences: ${m.occurrenceCount}\n`;
      report += `Total Duration Affected: ${m.totalDurationAffected} minutes\n`;
      report += `Estimated Lost Capacity: ${m.estimatedLostCapacity} flights\n`;
      report += `Most Common Trigger: ${m.mostCommonTriggerAircraftType}\n`;
      report += '-------------------------------------------\n';
    });
    
    return report;
  }
}

// Helper function to generate recommendations report in different formats
function generateRecommendationsReport(recommendations: OptimizationRecommendation[], format: string): string {
  if (format === 'json') {
    return JSON.stringify(recommendations, null, 2);
  } else if (format === 'csv') {
    // Simple CSV format
    const header = 'RecommendationID,Type,Description,EstimatedCapacityGain,Complexity\n';
    const rows = recommendations.map(r => 
      `${r.recommendationID},${r.recommendationType},${r.description.replace(/,/g, ';')},${r.estimatedCapacityGain},${r.implementationComplexity}`
    ).join('\n');
    return header + rows;
  } else {
    // Text format
    let report = 'OPTIMIZATION RECOMMENDATIONS REPORT\n';
    report += '==================================\n\n';
    
    recommendations.forEach((r, index) => {
      report += `Recommendation #${index + 1}\n`;
      report += `Type: ${r.recommendationType}\n`;
      report += `Description: ${r.description}\n`;
      report += `Estimated Capacity Gain: ${r.estimatedCapacityGain} flights per day\n`;
      report += `Implementation Complexity: ${r.implementationComplexity}\n`;
      report += `Affected Stands: ${r.affectedStands.join(', ')}\n`;
      report += '-------------------------------------------\n';
    });
    
    return report;
  }
}

// Parse command line arguments
program.parse(process.argv);

// If no arguments provided, show help
if (process.argv.length < 3) {
  program.outputHelp();
} 