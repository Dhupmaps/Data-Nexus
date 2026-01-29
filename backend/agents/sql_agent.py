import sqlite3

def sql_insertion_node(state):
    print("--- SQL AGENT: Saving to DB ---")
    results = state["audit_results"]
    
    # Connect to local SQLite DB
    conn = sqlite3.connect("company_audit.db")
    cursor = conn.cursor()
    
    # 1.Drop old table (Development only: ensures schema update)
    cursor.execute("DROP TABLE IF EXISTS expenses")

    # 2.Create Table with employee_id
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id TEXT,
            category TEXT,
            amount REAL,
            status TEXT,
            reason TEXT
        )
    ''')
    
    # 3.Insert Approved/Rejected Data
    for row in results:
        cursor.execute('''
            INSERT INTO expenses (employee_id, category, amount, status, reason)
            VALUES (?, ?, ?, ?, ?)
        ''', (row.get("EmployeeID"), row.get("Category"), row.get("Amount"), row.get("Status"), row.get("Reason")))
        
    conn.commit()
    conn.close()
    
    return {"messages": ["Data committed to SQL Database."]}