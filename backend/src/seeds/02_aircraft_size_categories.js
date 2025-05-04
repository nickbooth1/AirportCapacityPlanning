/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('aircraft_size_categories').del();
  
  // Insert seed entries
  await knex('aircraft_size_categories').insert([
    {
      code: 'A',
      name: 'Small',
      description: 'Small aircraft with wingspan less than 15m',
      wingspan_min_meters: 0,
      wingspan_max_meters: 15,
      length_min_meters: 0,
      length_max_meters: 15
    },
    {
      code: 'B',
      name: 'Medium',
      description: 'Medium-sized aircraft with wingspan between 15m and 24m',
      wingspan_min_meters: 15,
      wingspan_max_meters: 24,
      length_min_meters: 15,
      length_max_meters: 24
    },
    {
      code: 'C',
      name: 'Medium Large',
      description: 'Medium-large aircraft with wingspan between 24m and 36m',
      wingspan_min_meters: 24,
      wingspan_max_meters: 36,
      length_min_meters: 24,
      length_max_meters: 36
    },
    {
      code: 'D',
      name: 'Large',
      description: 'Large aircraft with wingspan between 36m and 52m',
      wingspan_min_meters: 36,
      wingspan_max_meters: 52,
      length_min_meters: 36,
      length_max_meters: 50
    },
    {
      code: 'E',
      name: 'Very Large',
      description: 'Very large aircraft with wingspan between 52m and 65m',
      wingspan_min_meters: 52,
      wingspan_max_meters: 65,
      length_min_meters: 50,
      length_max_meters: 70
    },
    {
      code: 'F',
      name: 'Extremely Large',
      description: 'Extremely large aircraft with wingspan between 65m and 80m',
      wingspan_min_meters: 65,
      wingspan_max_meters: 80,
      length_min_meters: 70,
      length_max_meters: 90
    }
  ]);
}; 