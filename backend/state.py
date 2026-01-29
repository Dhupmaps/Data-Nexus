from typing import TypedDict, List, Optional, Dict

class AgentState(TypedDict):
    policy_path: str
    expense_path: str
    
    policy_rules: Optional[dict]       
    expense_data: Optional[List[dict]] 
    employee_details: Optional[Dict]
    audit_results: Optional[List[dict]] 
    messages: List[str]
