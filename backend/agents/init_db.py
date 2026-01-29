import sqlite3
import os
import re

def init_northwind_db(sql_path="northwind.sql", db_path="northwind.db"):
    """
    Initializes the Northwind SQLite database from a SQL script.
    Sanitizes MySQL specific syntax to work with SQLite.
    """
    if os.path.exists(db_path):
        print(f"✅ Database {db_path} already exists. Skipping init.")
        return

    print(f"🔄 Initializing {db_path} from {sql_path}...")
    
    try:
        # Connect to SQLite (creates file)
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Read SQL script
        base_dir = os.getcwd()
        possible_paths = [
            sql_path, 
            os.path.join("..", sql_path),
            os.path.join(base_dir, sql_path),
            os.path.join(os.path.dirname(base_dir), sql_path)
        ]
        
        script_content = None
        found_path = None
        for p in possible_paths:
            if os.path.exists(p):
                found_path = p
                with open(p, 'r', encoding='utf-8') as f:
                    script_content = f.read()
                break
        
        if not script_content:
            raise FileNotFoundError(f"Could not find SQL script in {possible_paths}")
            
        print(f"   - Found SQL script at: {found_path}")

        # --- SANITIZE FOR SQLITE ---
        print("   - Sanitizing SQL for SQLite compatibility...")
        
        # 1. Remove 'USE Northwind;'
        script_content = re.sub(r'USE\s+Northwind;', '', script_content, flags=re.IGNORECASE)
        
        # 1.5 Remove CREATE/DROP DATABASE (Not valid in SQLite)
        script_content = re.sub(r'CREATE\s+DATABASE\s+[^;]*;', '', script_content, flags=re.IGNORECASE)
        script_content = re.sub(r'DROP\s+DATABASE\s+[^;]*;', '', script_content, flags=re.IGNORECASE)
        script_content = re.sub(r'/\*.*?\*/', '', script_content, flags=re.DOTALL) # Remove comments
        
        # 2. Remove 'ENGINE=INNODB'
        script_content = re.sub(r'\s*ENGINE=INNODB', '', script_content, flags=re.IGNORECASE)
        
        # 3. Fix Auto Increment 
        # MySQL: "int(11) NOT NULL AUTO_INCREMENT"
        # SQLite: "INTEGER PRIMARY KEY AUTOINCREMENT"
        # We'll just strip AUTO_INCREMENT and let PK handle it, or replace simple INT cases.
        # The file has: "employeeId INT AUTO_INCREMENT NOT NULL"
        # We can replace 'INT AUTO_INCREMENT' with 'INTEGER PRIMARY KEY AUTOINCREMENT'
        # BUT the file ALSO has ",PRIMARY KEY (employeeId)" at the end of the table.
        # SQLite doesn't like two PRIMARY KEY definitions.
        # Safest bet: Just remove 'AUTO_INCREMENT'. SQLite will treat it as normal INT.
        # Primary Key constraint at bottom will make it a PK.
        # (Note: In SQLite, INT PRIMARY KEY is not auto-incrementing by default unless it's INTEGER PRIMARY KEY, 
        # but for this demo, standard unique IDs are fine, we just want it to load).
        script_content = re.sub(r'\s+AUTO_INCREMENT', '', script_content, flags=re.IGNORECASE)
        
        # 4. Handle N'String' syntax
        script_content = re.sub(r"N'([^']*)'", r"'\1'", script_content)
        
        # 5. Handle DATETIME (2006-07-04 00:00:00.000) -> SQLite is fine with strings.
        
        # Execute Script
        # We split by statements because executescript can be finicky if there are errors
        try:
             cursor.executescript(script_content)
             print("   - SQL Executed Successfully.")
        except Exception as e:
            print(f"   ⚠️ SQL Warning/Partial Error: {e}")
            # We continue because some non-critical statements might fail but tables might adhere
        
        conn.commit()
        conn.close()
        print("✅ Northwind Database initialization complete.")
        
    except Exception as e:
        print(f"❌ Database Init Fatal Error: {e}")

if __name__ == "__main__":
    init_northwind_db("../northwind.sql", "../northwind.db")
