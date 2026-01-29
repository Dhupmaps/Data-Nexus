import sqlite3
import random
from typing import Dict
from .init_db import init_northwind_db

def reference_agent_node(state):
    print("--- REFERENCE AGENT: Syncing with Northwind ---")
    
    # Ensure DB exists
    init_northwind_db("northwind.sql", "northwind.db")
    
    expenses = state.get("expense_data", [])
    if not expenses:
        return {"messages": ["No expenses to cross-reference."]}

    db_path = "northwind.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    employee_map = {}
    
    # Get unique Employee IDs from Excel
    sample_row = expenses[0]
    id_key = next((k for k in sample_row.keys() if str(k).lower().replace("_","") in ["id", "employeeid"]), None)
    
    if not id_key:
        conn.close()
        return {"messages": ["Reference Agent: Could not find Employee ID column."]}

    unique_ids = set(str(row[id_key]) for row in expenses)
    
    for emp_id in unique_ids:
        # Check if exists (Get Name, Title, and ReportsTo/mgrId)
        cursor.execute("SELECT FirstName, LastName, Title, mgrId FROM Employee WHERE EmployeeId = ?", (emp_id,))
        record = cursor.fetchone()
        
        manager_name = "HR" # Default if no manager found
        
        if record:
            # Found
            first, last, title, mgr_id = record
            
            # Lookup Manager Name if mgrId exists
            if mgr_id:
                cursor.execute("SELECT FirstName, LastName FROM Employee WHERE EmployeeId = ?", (mgr_id,))
                mgr_record = cursor.fetchone()
                if mgr_record:
                    manager_name = f"{mgr_record[0]} {mgr_record[1]}"
            
            details = {
                "name": f"{first} {last}",
                "title": title,
                "manager": manager_name
            }
        else:
            # AUTO-ONBOARDING
            print(f"⚠️ Employee #{emp_id} missing in SQL. Auto-onboarding...")
            
            f_name = random.choice(["Alex", "Jordan", "Taylor", "Casey"])
            l_name = random.choice(["Smith", "Doe", "Johnson", "Brown"])
            title = random.choice(["Vice President", "Sales Manager", "Sales Representative", "Intern"])
            
            # Assign a random manager ID from 1-9 (Northwind usually has 9 employees)
            mgr_id = random.randint(1, 9)
             
            try:
                cursor.execute("""
                    INSERT INTO Employee (EmployeeId, FirstName, LastName, Title, mgrId)
                    VALUES (?, ?, ?, ?, ?)
                """, (emp_id, f_name, l_name, title, mgr_id))
                conn.commit()
                
                # Fetch Manager Name for the new guy
                cursor.execute("SELECT FirstName, LastName FROM Employee WHERE EmployeeId = ?", (mgr_id,))
                mgr_record = cursor.fetchone()
                if mgr_record:
                    manager_name = f"{mgr_record[0]} {mgr_record[1]}"
                
                details = {
                    "name": f"{f_name} {l_name}",
                    "title": title,
                    "manager": manager_name,
                    "is_new": True
                }
            except Exception as e:
                print(f"Error onboarding {emp_id}: {e}")
                details = {"name": "Unknown", "title": "Reviewer", "manager": "System Admin"}

        employee_map[str(emp_id)] = details
        
    conn.close()
    
    return {
        "employee_details": employee_map,
        "messages": [f"Cross-referenced {len(unique_ids)} employees with Northwind DB."]
    }
