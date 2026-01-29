def auditor_node(state):
    print("--- AUDITOR: Verifying Tiered Compliance ---")
    
    if "policy_rules" not in state or not state["policy_rules"]:
        print("AUDITOR SKIPPED: No policy rules found.")
        return {
            "audit_results": [],
            "messages": ["Error: Policy extraction failed. Audit skipped."]
        }

    rules = state["policy_rules"]
    data = state["expense_data"]
    results = []
    
    # ROLE MULTIPLIERS
    ROLE_LIMITS = {
        "Vice President": 2.0,
        "Sales Manager": 1.5,
        "Sales Representative": 1.0,
        "Intern": 0.5
    }

    emp_details_map = state.get("employee_details", {})

    for row in data:
        # SMART COLUMN SEARCH
        def get_value(options, default=None):
            for key in options:
                if key in row:
                    return row[key]
            return default

        # 1. Find Employee ID
        emp_id = get_value(["id", "ID", "Employee ID", "EmployeeID", "employee_id"], "N/A")
        
        # 1.5 Get Northwind Details
        emp_info = emp_details_map.get(str(emp_id), {"name": "Unknown", "title": "Standard", "manager": "HR"})
        emp_name = emp_info.get("name")
        emp_title = emp_info.get("title")
        emp_manager = emp_info.get("manager")
        
        # Calculate Multiplier
        multiplier = 1.0
        for role, mult in ROLE_LIMITS.items():
            if role in emp_title:
                multiplier = mult
                break
        
        # 2. Find Amount
        raw_amount = get_value(["Amount", "amount", "Cost", "cost", "Value"], 0)
        try:
            clean_amount = str(raw_amount).replace("$", "").replace(",", "")
            amount = float(clean_amount)
        except:
            amount = 0.0
        
        # 3. Find Category & Type
        category_val = get_value(["Category", "category", "Description", "Type"], "Misc")
        category = str(category_val)
        cat_lower = category.lower()
        
        # AUDIT LOGIC 
        status = "APPROVED"
        reason = f"Compliant (Role: {emp_title})"
        limit_used = None 
        
        # CATEGORY DETECTION
        is_uber = any(w in cat_lower for w in ["uber", "ride", "taxi", "lyft", "transport"])
        is_hotel = any(w in cat_lower for w in ["hotel", "lodging", "stay", "airbnb"])
        is_meal = any(w in cat_lower for w in ["meal", "dinner", "lunch", "food"])
        is_flight = any(w in cat_lower for w in ["flight", "ticket", "air"])
        is_client = "client" in cat_lower
        is_team = "team" in cat_lower
        
        # USER DEFINED LIMITS (Base Limits)
        LIMITS = {
            "uber": 150.0,
            "hotel": 1500.0,
            "meal": 500.0,
            "flight": 3000.0
        }

        base_limit = 0.0
        
        if is_uber:
            base_limit = LIMITS["uber"]
            limit_used = base_limit * multiplier
            if amount > limit_used:
                status = "REJECTED"
                reason = f"Uber Limit ${limit_used} exceeded (Role: {emp_title}, Cap: {multiplier}x)"

        elif is_hotel:
            base_limit = LIMITS["hotel"]
            limit_used = base_limit * multiplier
            if amount > limit_used:
                status = "REJECTED"
                reason = f"Hotel Limit ${limit_used} exceeded (Role: {emp_title}, Cap: {multiplier}x)"

        elif is_meal:
            # CLIENT ENTERTAINMENT IS EXEMPT/UNLIMITED
            if is_client:
                 status = "APPROVED"
                 reason = f"Client Entertainment (Unlimited) - Role: {emp_title}"
                 limit_used = "Unlimited"
            else:
                base_limit = LIMITS["meal"]
                limit_used = base_limit * multiplier
                if amount > limit_used:
                    status = "REJECTED"
                    reason = f"Meal Limit ${limit_used} exceeded (Role: {emp_title}, Cap: {multiplier}x)"

        elif is_flight:
            base_limit = LIMITS["flight"]
            limit_used = base_limit * multiplier
            if amount > limit_used:
                status = "REJECTED"
                reason = f"Flight Limit ${limit_used} exceeded (Role: {emp_title}, Cap: {multiplier}x)"
        
        # ESCALATION LOGIC
        if status == "REJECTED":
            # If manager is 'None' or missing, fallback to 'HR'
            mgr = emp_manager if emp_manager and emp_manager != "None" else "HR"
            reason += f" - Escalate to {mgr}"

        # FINAL DATA CLEANUP FOR FRONTEND
        clean_row = {
            "EmployeeID": emp_id,
            "EmployeeName": emp_name, 
            "EmployeeTitle": emp_title,
            "Manager": emp_manager, # NEW FIELD
            "Category": category,  
            "Amount": amount,      
            "Status": status,
            "Reason": reason,
            "LimitUsed": limit_used
        }
        results.append(clean_row)
        
    return {
        "audit_results": results,
        "messages": ["Tiered audit logic applied with Role Multipliers."]
    }