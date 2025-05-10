/**
 * CLI Prompts Manager
 * Handles interactive prompts for CLI interface
 */
const inquirer = require('inquirer');
const dataMapper = require('../lib/dataMapper');

/**
 * Handle interactive mapping prompts
 * @param {Array} sourceFields - Source fields from the file
 * @param {string} entityType - Entity type to validate
 * @returns {Object} - Mapping profile
 */
async function handleMappingPrompts(sourceFields, entityType) {
  const targetFields = dataMapper.getMappingFields(entityType);
  
  // Generate suggestions
  const suggestions = dataMapper.generateMappingSuggestions(sourceFields, targetFields);
  
  // Create mappings object
  const mappings = {};
  
  // Prompt for each target field
  for (const targetField of targetFields) {
    const suggestion = suggestions[targetField];
    
    const choices = [
      ...(suggestion ? [{name: `${suggestion} (suggested)`, value: suggestion}] : []),
      ...sourceFields.map(field => ({
        name: field,
        value: field
      })),
      {name: '[Skip this field]', value: null}
    ];
    
    const { mapping } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mapping',
        message: `Map target field '${targetField}' to source field:`,
        choices,
        default: suggestion || null
      }
    ]);
    
    // Store mapping
    mappings[targetField] = mapping;
  }
  
  // Create transformations
  const transformations = {};
  
  // Apply common transformations
  if (mappings.ScheduledTime) {
    transformations.ScheduledTime = 'convertDateTime';
  }
  
  if (mappings.IsArrival) {
    transformations.IsArrival = 'stringToBoolean';
  }
  
  // Optionally add other field-specific transformations
  const mappingProfile = {
    profileName: 'custom-mapping',
    entityType,
    lastUsed: new Date().toISOString(),
    mappings,
    transformations
  };
  
  return mappingProfile;
}

/**
 * Handle interactive error fixing prompts
 * @param {Array} data - Data records
 * @param {Array} errors - Validation errors
 * @returns {Array} - Updated data records
 */
async function handleErrorFixPrompts(data, errors) {
  // Group errors by field
  const errorsByField = {};
  
  errors.forEach(error => {
    if (!error.field) return;
    
    if (!errorsByField[error.field]) {
      errorsByField[error.field] = [];
    }
    
    errorsByField[error.field].push(error);
  });
  
  // Show error summary
  console.log('\nError Summary:');
  Object.entries(errorsByField).forEach(([field, fieldErrors]) => {
    console.log(`- ${field}: ${fieldErrors.length} errors`);
  });
  
  // Ask if user wants to fix errors
  const { shouldFix } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'shouldFix',
      message: 'Would you like to fix some errors?',
      default: true
    }
  ]);
  
  if (!shouldFix) {
    return data;
  }
  
  // Ask which field to fix
  const { fieldToFix } = await inquirer.prompt([
    {
      type: 'list',
      name: 'fieldToFix',
      message: 'Which field would you like to fix?',
      choices: Object.keys(errorsByField).map(field => ({
        name: `${field} (${errorsByField[field].length} errors)`,
        value: field
      }))
    }
  ]);
  
  // Get unique error types for this field
  const uniqueErrors = {};
  errorsByField[fieldToFix].forEach(error => {
    if (!uniqueErrors[error.code]) {
      uniqueErrors[error.code] = error;
    }
  });
  
  // Show examples of errors
  console.log(`\nExamples of ${fieldToFix} errors:`);
  Object.values(uniqueErrors).forEach(error => {
    console.log(`- ${error.message} (${error.recordId}, value: ${error.value})`);
  });
  
  // Determine fix type
  const fixOptions = [
    { name: 'Apply default value to all missing/invalid entries', value: 'default' },
    { name: 'Transform values with a pattern', value: 'transform' },
    { name: 'Skip fixing these errors', value: 'skip' }
  ];
  
  const { fixType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'fixType',
      message: 'How would you like to fix these errors?',
      choices: fixOptions
    }
  ]);
  
  if (fixType === 'skip') {
    return data;
  }
  
  // Apply fixes
  if (fixType === 'default') {
    // Get default value
    const { defaultValue } = await inquirer.prompt([
      {
        type: 'input',
        name: 'defaultValue',
        message: `Enter default value for ${fieldToFix}:`,
        default: getSuggestedDefaultValue(fieldToFix)
      }
    ]);
    
    // Apply default value
    return data.map(record => {
      const recordCopy = { ...record };
      
      // If field is missing or empty
      if (
        recordCopy[fieldToFix] === undefined || 
        recordCopy[fieldToFix] === null || 
        recordCopy[fieldToFix] === ''
      ) {
        recordCopy[fieldToFix] = defaultValue;
      }
      
      return recordCopy;
    });
  }
  
  if (fixType === 'transform') {
    // Get prefix/suffix
    const { transformation } = await inquirer.prompt([
      {
        type: 'list',
        name: 'transformation',
        message: `Select transformation for ${fieldToFix}:`,
        choices: [
          { name: 'Add prefix', value: 'prefix' },
          { name: 'Add suffix', value: 'suffix' },
          { name: 'Replace text', value: 'replace' },
          { name: 'Convert to uppercase', value: 'uppercase' },
          { name: 'Convert to lowercase', value: 'lowercase' }
        ]
      }
    ]);
    
    let prefix, suffix, search, replace;
    
    if (transformation === 'prefix') {
      const response = await inquirer.prompt([
        {
          type: 'input',
          name: 'prefix',
          message: 'Enter prefix to add:'
        }
      ]);
      prefix = response.prefix;
    } else if (transformation === 'suffix') {
      const response = await inquirer.prompt([
        {
          type: 'input',
          name: 'suffix',
          message: 'Enter suffix to add:'
        }
      ]);
      suffix = response.suffix;
    } else if (transformation === 'replace') {
      const response = await inquirer.prompt([
        {
          type: 'input',
          name: 'search',
          message: 'Enter text to replace:'
        },
        {
          type: 'input',
          name: 'replace',
          message: 'Enter replacement text:'
        }
      ]);
      search = response.search;
      replace = response.replace;
    }
    
    // Apply transformation
    return data.map(record => {
      const recordCopy = { ...record };
      
      if (recordCopy[fieldToFix] !== undefined) {
        const value = String(recordCopy[fieldToFix]);
        
        if (transformation === 'prefix') {
          recordCopy[fieldToFix] = prefix + value;
        } else if (transformation === 'suffix') {
          recordCopy[fieldToFix] = value + suffix;
        } else if (transformation === 'replace') {
          recordCopy[fieldToFix] = value.replace(new RegExp(search, 'g'), replace);
        } else if (transformation === 'uppercase') {
          recordCopy[fieldToFix] = value.toUpperCase();
        } else if (transformation === 'lowercase') {
          recordCopy[fieldToFix] = value.toLowerCase();
        }
      }
      
      return recordCopy;
    });
  }
  
  return data;
}

/**
 * Get suggested default value for a field
 * @param {string} field - Field name
 * @returns {string} - Suggested default value
 */
function getSuggestedDefaultValue(field) {
  const defaultValues = {
    'FlightID': 'UNKNOWN',
    'FlightNumber': 'UNKNOWN',
    'AirlineCode': 'ZZ',
    'AircraftType': 'B738',
    'Origin': 'XXX',
    'Destination': 'XXX',
    'ScheduledTime': new Date().toISOString(),
    'Terminal': 'T1',
    'IsArrival': 'true'
  };
  
  return defaultValues[field] || '';
}

module.exports = {
  handleMappingPrompts,
  handleErrorFixPrompts
}; 