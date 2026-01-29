from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil
import os
import glob
import sqlite3
import pandas as pd
from graph import app_graph 

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from typing import Optional

#REQUEST MODELS
class UpdateStatusRequest(BaseModel):
    employee_id: str
    amount: float
    category: str
    new_status: str
    reimbursed_amount: Optional[float] = None

#ENDPOINTS

@app.post("/run-audit")
async def run_audit(policy: UploadFile = File(...), expenses: UploadFile = File(...)):
    os.makedirs("uploads", exist_ok=True)
    policy_path = f"uploads/{policy.filename}"
    expense_path = f"uploads/{expenses.filename}"
    
    with open(policy_path, "wb") as f:
        shutil.copyfileobj(policy.file, f)
    with open(expense_path, "wb") as f:
        shutil.copyfileobj(expenses.file, f)
    
    # Run the imported graph
    initial_state = {
        "policy_path": policy_path,
        "expense_path": expense_path,
        "messages": []
    }
    
    result = app_graph.invoke(initial_state)
    return {"audit_report": result["audit_results"]}

@app.put("/update-status")
async def update_status(req: UpdateStatusRequest):
    print(f"Updating Status for {req.employee_id} to {req.new_status} (Reimbursed: {req.reimbursed_amount})...")

    #1. Update SQL Database
    try:
        conn = sqlite3.connect("company_audit.db")
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE expenses 
            SET status = ? 
            WHERE employee_id = ? AND amount = ? AND category = ?
        ''', (req.new_status, req.employee_id, req.amount, req.category))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"SQL Error: {e}")

    #2. Update Excel File
    try:
        list_of_files = glob.glob('uploads/*.xlsx')
        if list_of_files:
            latest_file = max(list_of_files, key=os.path.getctime)
            
            df = pd.read_excel(latest_file)
            df.columns = [c.strip() for c in df.columns] 

            id_col = next((col for col in df.columns if col.lower() in ['id', 'employeeid', 'employee id']), None)
            
            amount_col = next((col for col in df.columns if col.lower() in ['amount', 'cost', 'value']), None)
            cat_col = next((col for col in df.columns if col.lower() in ['category', 'description', 'type']), None)

            if id_col and amount_col and cat_col:
                mask = (df[id_col].astype(str) == str(req.employee_id)) & \
                       (df[amount_col] == req.amount) & \
                       (df[cat_col] == req.category)
                
                if not df.loc[mask].empty:
                    if 'Status' not in df.columns: df['Status'] = 'PENDING'
                    
                    df.loc[mask, 'Status'] = req.new_status
                    
                    if req.reimbursed_amount is not None:
                        if 'Reimbursed Amount' not in df.columns: df['Reimbursed Amount'] = 0.0
                        df.loc[mask, 'Reimbursed Amount'] = req.reimbursed_amount

                    df.to_excel(latest_file, index=False)
                    print(f" Excel Updated: {latest_file}")
                else:
                    print(" Row not found in Excel.")
    except Exception as e:
        print(f" Excel Error: {e}")

    return {"status": "Updated"}

@app.get("/download-excel")
async def download_excel():
    try:
        list_of_files = glob.glob('uploads/*.xlsx')
        if not list_of_files:
            return {"error": "No files found"}
            
        latest_file = max(list_of_files, key=os.path.getctime)
        return FileResponse(
            latest_file, 
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
            filename="Audited_Expenses_UPDATED.xlsx"
        )
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)