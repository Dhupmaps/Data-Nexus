import pandas as pd

def excel_loading_node(state):
    print("--- EXCEL AGENT: Loading Data ---")
    
    # Read Excel
    df = pd.read_excel(state["expense_path"])

    df.columns = [c.strip() for c in df.columns]

    print(f"DEBUG - Excel Columns Found: {df.columns.tolist()}")

    data = df.to_dict(orient="records")
    
    return {
        "expense_data": data,
        "messages": [f"Loaded {len(data)} rows from Excel."]
    }