/**
 * Data Transformer Service
 * 
 * This service provides transformation functions to convert database results
 * into presentable formats suitable for the agent and frontend.
 */

const { DateTime } = require('luxon');

class DataTransformerService {
  /**
   * Transform stand data for presentation
   * 
   * @param {Object|Array} data - Stand data (single object or array of stands)
   * @param {string} format - Output format ('simple', 'detailed', 'list', 'map')
   * @returns {Object|Array} - Transformed stand data
   */
  transformStandData(data, format = 'simple') {
    // Handle case where data is an array
    if (Array.isArray(data)) {
      return data.map(stand => this.transformStandData(stand, format));
    }
    
    // Handle single stand object
    const stand = data;
    
    switch (format) {
      case 'simple':
        // Basic stand details
        return {
          id: stand.id,
          code: stand.code,
          name: stand.name,
          type: stand.stand_type,
          isActive: stand.is_active,
          location: stand.pier?.name ? `${stand.pier.terminal?.name || ''} / ${stand.pier.name}` : 'Unassigned',
          hasJetbridge: stand.has_jetbridge
        };
        
      case 'detailed':
        // Detailed stand information
        const transformedStand = {
          id: stand.id,
          code: stand.code,
          name: stand.name,
          type: stand.stand_type,
          isActive: stand.is_active,
          hasJetbridge: stand.has_jetbridge,
          maxWingspanMeters: stand.max_wingspan_meters,
          maxLengthMeters: stand.max_length_meters,
          maxAircraftSizeCode: stand.max_aircraft_size_code,
          description: stand.description || '',
          coordinates: {
            latitude: stand.latitude,
            longitude: stand.longitude
          },
          pier: stand.pier ? {
            id: stand.pier.id,
            name: stand.pier.name,
            code: stand.pier.code,
            terminal: stand.pier.terminal ? {
              id: stand.pier.terminal.id,
              name: stand.pier.terminal.name,
              code: stand.pier.terminal.code
            } : null
          } : null
        };
        
        // Add maintenance status if available
        if (stand.isUnderMaintenance !== undefined) {
          transformedStand.maintenanceStatus = {
            isUnderMaintenance: stand.isUnderMaintenance,
            activeRequests: stand.activeMaintenanceRequests?.map(req => ({
              id: req.id,
              title: req.title,
              startTime: req.start_datetime,
              endTime: req.end_datetime,
              status: req.status?.name || 'Unknown'
            })) || []
          };
        }
        
        return transformedStand;
        
      case 'list':
        // Format for list displays
        return {
          id: stand.id,
          code: stand.code,
          name: stand.name,
          terminal: stand.pier?.terminal?.name || 'N/A',
          pier: stand.pier?.name || 'N/A',
          type: stand.stand_type,
          maxAircraftSize: stand.max_aircraft_size_code || 'Unknown',
          status: stand.is_active ? 'Active' : 'Inactive',
          hasJetbridge: stand.has_jetbridge ? 'Yes' : 'No'
        };
        
      case 'map':
        // Format for map visualization
        return {
          id: stand.id,
          code: stand.code,
          name: stand.name,
          type: stand.stand_type,
          coordinates: {
            lat: stand.latitude,
            lng: stand.longitude
          },
          isActive: stand.is_active,
          terminal: stand.pier?.terminal?.name || null,
          pier: stand.pier?.name || null,
          maintenanceStatus: stand.isUnderMaintenance ? 'Under Maintenance' : 'Available'
        };
        
      default:
        // Default to simple format
        return this.transformStandData(stand, 'simple');
    }
  }
  
  /**
   * Transform maintenance request data for presentation
   * 
   * @param {Object|Array} data - Maintenance request data
   * @param {string} format - Output format ('simple', 'detailed', 'list', 'calendar')
   * @returns {Object|Array} - Transformed maintenance data
   */
  transformMaintenanceData(data, format = 'simple') {
    // Handle case where data is an array
    if (Array.isArray(data)) {
      return data.map(request => this.transformMaintenanceData(request, format));
    }
    
    // Handle single maintenance request object
    const request = data;
    
    switch (format) {
      case 'simple':
        // Basic maintenance details
        return {
          id: request.id,
          title: request.title,
          standCode: request.stand?.code || 'Unknown',
          status: request.status?.name || 'Unknown',
          startDate: this._formatDate(request.start_datetime),
          endDate: this._formatDate(request.end_datetime),
          priority: request.priority
        };
        
      case 'detailed':
        // Detailed maintenance information
        return {
          id: request.id,
          title: request.title,
          description: request.description,
          stand: request.stand ? {
            id: request.stand.id,
            code: request.stand.code,
            name: request.stand.name,
            pier: request.stand.pier?.name || null,
            terminal: request.stand.pier?.terminal?.name || null
          } : null,
          status: request.status ? {
            id: request.status.id,
            name: request.status.name,
            color: request.status.color || null
          } : null,
          startDatetime: request.start_datetime,
          endDatetime: request.end_datetime,
          duration: this._calculateDuration(request.start_datetime, request.end_datetime),
          requestor: {
            name: request.requestor_name,
            email: request.requestor_email,
            department: request.requestor_department
          },
          priority: request.priority,
          impactDescription: request.impact_description || null,
          approvals: request.approvals?.map(approval => ({
            id: approval.id,
            approverName: approval.approver?.name || approval.approver_name || 'Unknown',
            approvedAt: approval.approved_at,
            comments: approval.comments || null
          })) || [],
          createdAt: request.created_at,
          updatedAt: request.updated_at
        };
        
      case 'list':
        // Format for list displays
        return {
          id: request.id,
          title: request.title,
          stand: request.stand?.code || 'Unknown',
          location: request.stand?.pier?.name 
            ? `${request.stand.pier.terminal?.name || ''} / ${request.stand.pier.name}`
            : 'Unknown',
          status: request.status?.name || 'Unknown',
          priority: request.priority,
          period: `${this._formatDate(request.start_datetime)} to ${this._formatDate(request.end_datetime)}`,
          requestor: request.requestor_name,
          department: request.requestor_department
        };
        
      case 'calendar':
        // Format for calendar visualization
        return {
          id: request.id,
          title: `${request.stand?.code || 'Unknown'}: ${request.title}`,
          start: request.start_datetime,
          end: request.end_datetime,
          allDay: false,
          extendedProps: {
            standId: request.stand_id,
            standCode: request.stand?.code,
            standName: request.stand?.name,
            status: request.status?.name || 'Unknown',
            statusColor: request.status?.color || '#cccccc',
            priority: request.priority,
            description: request.description
          }
        };
        
      default:
        // Default to simple format
        return this.transformMaintenanceData(request, 'simple');
    }
  }
  
  /**
   * Transform airport configuration data for presentation
   * 
   * @param {Object} data - Airport configuration data
   * @param {string} format - Output format ('simple', 'detailed', 'hierarchy')
   * @returns {Object} - Transformed configuration data
   */
  transformAirportConfigData(data, format = 'simple') {
    switch (format) {
      case 'simple':
        // Simple summary of configuration
        return {
          terminals: data.terminals?.length || 0,
          piers: data.piers?.length || 0,
          stands: data.stands?.length || 0,
          aircraftTypes: data.aircraftTypes?.length || 0,
          operationalHours: data.operationalSettings 
            ? `${data.operationalSettings.operating_start_time} to ${data.operationalSettings.operating_end_time}`
            : 'Unknown'
        };
        
      case 'detailed':
        // Detailed configuration information
        return {
          terminals: data.terminals?.map(terminal => ({
            id: terminal.id,
            name: terminal.name,
            code: terminal.code,
            pierCount: terminal.piers?.length || 0
          })) || [],
          piers: data.piers?.map(pier => ({
            id: pier.id,
            name: pier.name,
            code: pier.code,
            terminalId: pier.terminal_id,
            terminalName: pier.terminal?.name || 'Unknown',
            standCount: pier.stands?.length || 0
          })) || [],
          stands: data.stands?.map(stand => this.transformStandData(stand, 'simple')) || [],
          aircraftTypes: data.aircraftTypes?.map(type => ({
            id: type.id,
            code: type.code,
            name: type.name,
            category: type.size_category,
            isActive: type.is_active
          })) || [],
          operationalSettings: data.operationalSettings ? {
            operatingHours: {
              start: data.operationalSettings.operating_start_time,
              end: data.operationalSettings.operating_end_time
            },
            slotDuration: data.operationalSettings.slot_duration_minutes,
            defaultGap: data.operationalSettings.default_gap_minutes
          } : null
        };
        
      case 'hierarchy':
        // Hierarchical view of airport structure
        const terminals = data.terminals?.map(terminal => {
          const piers = data.piers
            ?.filter(pier => pier.terminal_id === terminal.id)
            .map(pier => {
              const stands = data.stands
                ?.filter(stand => stand.pier_id === pier.id)
                .map(stand => ({
                  id: stand.id,
                  code: stand.code,
                  name: stand.name,
                  type: stand.stand_type,
                  isActive: stand.is_active,
                  maxAircraftSize: stand.max_aircraft_size_code
                })) || [];
                
              return {
                id: pier.id,
                name: pier.name,
                code: pier.code,
                standCount: stands.length,
                stands
              };
            }) || [];
            
          return {
            id: terminal.id,
            name: terminal.name,
            code: terminal.code,
            pierCount: piers.length,
            piers
          };
        }) || [];
        
        return {
          terminals,
          unassignedStands: data.stands
            ?.filter(stand => !stand.pier_id)
            .map(stand => ({
              id: stand.id,
              code: stand.code,
              name: stand.name,
              type: stand.stand_type,
              isActive: stand.is_active,
              maxAircraftSize: stand.max_aircraft_size_code
            })) || []
        };
        
      default:
        // Default to simple format
        return this.transformAirportConfigData(data, 'simple');
    }
  }
  
  /**
   * Transform aircraft type data for presentation
   * 
   * @param {Object|Array} data - Aircraft type data
   * @param {string} format - Output format ('simple', 'detailed')
   * @returns {Object|Array} - Transformed aircraft type data
   */
  transformAircraftTypeData(data, format = 'simple') {
    // Handle case where data is an array
    if (Array.isArray(data)) {
      return data.map(type => this.transformAircraftTypeData(type, format));
    }
    
    // Handle single aircraft type object
    const aircraftType = data;
    
    switch (format) {
      case 'simple':
        // Basic aircraft type details
        return {
          id: aircraftType.id,
          code: aircraftType.code,
          name: aircraftType.name,
          category: aircraftType.size_category,
          isActive: aircraftType.is_active
        };
        
      case 'detailed':
        // Detailed aircraft type information
        return {
          id: aircraftType.id,
          code: aircraftType.code,
          name: aircraftType.name,
          category: aircraftType.size_category,
          wingspan: aircraftType.wingspan_meters,
          length: aircraftType.length_meters,
          bodyType: aircraftType.body_type,
          description: aircraftType.description || '',
          isActive: aircraftType.is_active,
          createdAt: aircraftType.created_at,
          updatedAt: aircraftType.updated_at,
          turnaroundRule: aircraftType.turnaroundRule ? {
            id: aircraftType.turnaroundRule.id,
            minTurnaroundMinutes: aircraftType.turnaroundRule.min_turnaround_minutes
          } : null
        };
        
      default:
        // Default to simple format
        return this.transformAircraftTypeData(aircraftType, 'simple');
    }
  }
  
  /**
   * Transform statistics data for visualization
   * 
   * @param {Object} data - Statistics data
   * @param {string} type - Type of statistics ('stands', 'maintenance', 'capacity')
   * @returns {Object} - Transformed statistics data
   */
  transformStatisticsData(data, type = 'stands') {
    switch (type) {
      case 'stands':
        // Transform stand statistics
        return {
          summary: {
            totalStands: data.totalCount,
            activeStands: data.countByActiveStatus?.active || 0,
            inactiveStands: data.countByActiveStatus?.inactive || 0,
            underMaintenanceCount: data.underMaintenanceCount || 0
          },
          chartData: {
            byType: Object.entries(data.countByType || {}).map(([type, count]) => ({
              label: this._formatStandType(type),
              value: count
            })),
            byPier: Object.entries(data.countByPier || {}).map(([pier, count]) => ({
              label: pier,
              value: count
            }))
          }
        };
        
      case 'maintenance':
        // Transform maintenance statistics
        return {
          summary: {
            totalRequests: data.totalCount,
            averageDurationDays: data.averageDurationDays
          },
          chartData: {
            byStatus: Object.entries(data.countByStatus || {}).map(([status, count]) => ({
              label: status,
              value: count
            })),
            byPriority: Object.entries(data.countByPriority || {}).map(([priority, count]) => ({
              label: priority,
              value: count
            })),
            byMonth: Object.entries(data.countByMonth || {}).map(([month, count]) => ({
              label: month,
              value: count
            }))
          }
        };
        
      case 'capacity':
        // Transform capacity statistics
        return {
          summary: {
            totalCapacity: data.totalCapacity,
            peakHourCapacity: data.peakHourCapacity,
            standUtilization: `${data.utilizationPercentage}%`,
            constrainedBy: data.constrainedBy
          },
          chartData: {
            byTimeSlot: data.capacityByTimeSlot?.map(slot => ({
              label: slot.timeSlot,
              value: slot.capacity,
              baseline: slot.baselineCapacity || null
            })) || [],
            byAircraftSize: data.capacityByAircraftSize?.map(size => ({
              label: size.aircraftSize,
              value: size.capacity
            })) || []
          }
        };
        
      default:
        // Return data unchanged if type not recognized
        return data;
    }
  }
  
  /**
   * Format a date for display
   * 
   * @private
   * @param {string|Date} date - The date to format
   * @param {string} format - Date format ('short', 'medium', 'long')
   * @returns {string} - Formatted date string
   */
  _formatDate(date, format = 'medium') {
    if (!date) return 'N/A';
    
    const dateTime = typeof date === 'string' 
      ? DateTime.fromISO(date) 
      : DateTime.fromJSDate(date);
    
    if (!dateTime.isValid) return 'Invalid date';
    
    switch (format) {
      case 'short':
        return dateTime.toFormat('yyyy-MM-dd');
      case 'long':
        return dateTime.toFormat('EEEE, MMMM d, yyyy HH:mm');
      case 'time':
        return dateTime.toFormat('HH:mm');
      case 'medium':
      default:
        return dateTime.toFormat('yyyy-MM-dd HH:mm');
    }
  }
  
  /**
   * Calculate duration between two dates
   * 
   * @private
   * @param {string|Date} startDate - Start date
   * @param {string|Date} endDate - End date
   * @returns {string} - Formatted duration
   */
  _calculateDuration(startDate, endDate) {
    if (!startDate || !endDate) return 'Unknown';
    
    const start = typeof startDate === 'string' 
      ? DateTime.fromISO(startDate) 
      : DateTime.fromJSDate(startDate);
      
    const end = typeof endDate === 'string' 
      ? DateTime.fromISO(endDate) 
      : DateTime.fromJSDate(endDate);
    
    if (!start.isValid || !end.isValid) return 'Invalid dates';
    
    const diff = end.diff(start, ['days', 'hours', 'minutes']).toObject();
    
    const days = Math.floor(diff.days || 0);
    const hours = Math.floor(diff.hours || 0);
    const minutes = Math.floor(diff.minutes || 0);
    
    // Format duration nicely
    const parts = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    
    return parts.join(', ') || '0 minutes';
  }
  
  /**
   * Format stand type for better display
   * 
   * @private
   * @param {string} type - Raw stand type
   * @returns {string} - Formatted stand type
   */
  _formatStandType(type) {
    if (!type || type === 'unspecified') return 'Unspecified';
    
    // Capitalize first letter of each word
    return type.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

module.exports = new DataTransformerService();