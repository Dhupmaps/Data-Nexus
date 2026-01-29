## main.py
This is the main entry point for the API using FastAPI. It handles the communication between the frontend and the backend.

- Run Audit: It accepts the Policy PDF and Expense Excel files and starts the AI workflow.

- Update Status: When I change a status in the dashboard, this endpoint updates the database and also rewrites the original Excel file so everything stays in sync.

- Download Excel: This allows the frontend to download the updated Excel file with the new status changes.

## graph.py
I use this file to control the flow of the application using LangGraph. Instead of a messy script, it connects my agents in a specific order:

1. Extract rules from the PDF.
2. Load the Excel data.
3. Check for compliance.
4. Save the results to the database.

## state.py
This file acts like a shared clipboard or memory. It defines a standard format (AgentState) to hold file paths, extracted rules, and audit results so that data can be passed smoothly from one agent to the next.

## AI Agents (backend/agents/)

### pdf_agent.py
This agent is responsible for reading the policy document.

- Smart Indexing: It creates a temporary index to search the PDF for specific rules, like meal limits or flight caps.

- Cleanup: Once it extracts the info, it deletes the index immediately to prevent data from getting mixed up between runs.

### excel_agent.py
This script handles the data input. It reads the uploaded Excel file and cleans up the column headers (stripping out extra spaces) to ensure the rest of the system can read the data without errors.

### auditor_logic.py
This is the logic center of the app. It compares the extracted policy rules against the expense rows.

- Flexible Search: It can find columns like "Amount" or "Cost" regardless of how they are capitalized.

- Rules: It applies different logic based on the category—for example, it knows that "Client Meals" are unlimited, while "Team Meals" and "Personal Meals" have different dollar limits.

### sql_agent.py
This agent manages long-term storage. It connects to the SQLite database and saves every audit result (Employee ID, Status, Amount) so the data isn't lost when I refresh the page.