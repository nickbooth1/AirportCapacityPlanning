from datetime import datetime

class MockMaintenanceTracker:
    """
    Mock implementation of the maintenance tracker
    In a real system, this would integrate with a maintenance database
    """
    
    def __init__(self, maintenance_schedules):
        """
        Initialize the maintenance tracker with a list of maintenance entries
        
        Parameters:
        - maintenance_schedules: List of MaintenanceEntry objects
        """
        self.maintenance_schedules = maintenance_schedules
    
    def is_stand_under_maintenance(self, stand_name, query_start_time, query_end_time):
        """
        Check if a stand is under maintenance during the specified time period
        
        Parameters:
        - stand_name: The name of the stand to check
        - query_start_time: Start time of the period to check (datetime object)
        - query_end_time: End time of the period to check (datetime object)
        
        Returns:
        - True if the stand is under maintenance during any portion of the specified period, False otherwise
        """
        # Convert times to datetime objects if they're in string format
        if isinstance(query_start_time, str):
            query_start_time = datetime.strptime(query_start_time, "%H:%M")
        if isinstance(query_end_time, str):
            query_end_time = datetime.strptime(query_end_time, "%H:%M")
        
        # Check each maintenance entry for the specified stand
        for entry in self.maintenance_schedules:
            if entry.StandName != stand_name:
                continue
            
            # Check if the maintenance period overlaps with the query period
            # Two periods overlap if the start of one is before the end of the other,
            # and the end of one is after the start of the other
            if (entry.parsed_start_time < query_end_time and 
                entry.parsed_end_time > query_start_time):
                return True
        
        return False 