from langgraph.graph import StateGraph, END
from state import AgentState
from agents.pdf_agent import pdf_extraction_node
from agents.excel_agent import excel_loading_node
from agents.reference_agent import reference_agent_node
from agents.auditor_logic import auditor_node
from agents.sql_agent import sql_insertion_node

# Define Workflow
workflow = StateGraph(AgentState)

# Add Nodes
workflow.add_node("pdf_agent", pdf_extraction_node)
workflow.add_node("excel_agent", excel_loading_node)
workflow.add_node("reference_agent", reference_agent_node)
workflow.add_node("auditor", auditor_node)
workflow.add_node("sql_agent", sql_insertion_node)

# Define Flow
workflow.set_entry_point("pdf_agent")
workflow.add_edge("pdf_agent", "excel_agent")
workflow.add_edge("excel_agent", "reference_agent")
workflow.add_edge("reference_agent", "auditor")
workflow.add_edge("auditor", "sql_agent")
workflow.add_edge("sql_agent", END)

app_graph = workflow.compile()