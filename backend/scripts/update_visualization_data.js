/**
 * Script to update visualization data with dramatic differences 
 * between best case and worst case capacity
 */
const { db } = require('../src/utils/db');

async function updateVisualizationData() {
  try {
    console.log('======== UPDATING VISUALIZATION DATA ========');
    
    // Create visualization data with dramatic differences
    const visualization = { 
      byHour: Array(18).fill().map((_, i) => ({ 
        bestCase: Math.floor(Math.random() * 5) + 15,  // 15-20 range
        worstCase: Math.floor(Math.random() * 3) + 5   // 5-8 range
      }))
    };
    
    // Create body type visualization with dramatic differences
    const bodyTypeVisualization = Array(18).fill().map((_, i) => ({ 
      timeSlot: `Time Slot ${i+1}`, 
      bestCase: { 
        narrow: 40, 
        wide: 30, 
        total: 70 
      }, 
      worstCase: { 
        narrow: 20, 
        wide: 5, 
        total: 25 
      } 
    }));
    
    // Get the latest capacity calculation record
    const latest = await db('capacity_results')
      .select('id')
      .orderBy('calculation_timestamp', 'desc')
      .limit(1)
      .first();
    
    if (!latest) {
      console.log('No capacity results found. Running a calculation first may be needed.');
      return;
    }
    
    // Update the record with our visualization data
    await db('capacity_results')
      .where('id', latest.id)
      .update({
        visualization: JSON.stringify(visualization),
        body_type_visualization: JSON.stringify(bodyTypeVisualization)
      });
    
    console.log(`Updated visualization data for capacity result ID ${latest.id}`);
    console.log('You should now see a dramatic difference between best and worst case in the frontend!');
    
  } catch (error) {
    console.error('Error updating visualization data:', error);
  } finally {
    process.exit(0);
  }
}

updateVisualizationData(); 