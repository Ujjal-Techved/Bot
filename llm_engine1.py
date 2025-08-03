import google.generativeai as genai

# Set your Gemini API key
genai.configure(api_key="AIzaSyDOXcHwvAQF0gAB1aNlFbMSBLiaQNkiVWQ")

def generate_sql(question):
    prompt = f"""
        You are a SQL expert. Based on the following database schema, write a valid MSSQL query.
        
        Schema:
        Tables and relations:
        1. ProjectRequest(RequestID, RequestFromEmpID, Brand, RequestCode, ProjectID, RequestType, Module, AllocateHours, ScopeOfWork, ProjectStatus,
         EstimateHours, CRNRStatus, RequestDate, RequestStatus, SerialNo, ReqCreateDate, ReqRecvDate, WorkStatus, CRNRStatusUpdatedBY, RaiseInvoice, 
         WorkActionDate, Worktype, InitiatedBy, PONumber, POStatus)
        2. Invoices(InvoiceID, RequestID, ProjectID, InvoiceAmounts, InvoiceCreated, InvoiceCreatedBy)
        3. SkillsName(SkillID, SkillName, CategoryID)
        4. SKillCategory(CategoryID, CategoryName)
        5. EmpComments(ComentID, RequestID, EmpID, EmpType, Comments, CommentsDate)
        6. Payment_Milestone(PayMilestonID, Descriptions, ProjectID, MilestoneStatus, LastUpdated, UpdatedBy, MilestonecompleteDate)
        7. PaymentDates(PaymentDateID, PayMilestonID, PaymentDate, AddedBy, LastUpdated)
        8. FileUploads(FileID, ProjectID, FilePath, RequestCode)
        
        Question: {question}
        
        Only return the SQL query without explanation or formatting.
        """
    model = genai.GenerativeModel("emini-1.5-flash")
    chat = model.start_chat()
    response = chat.send_message(prompt)
    return response.text.strip()
