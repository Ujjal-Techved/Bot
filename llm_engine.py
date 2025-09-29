import openai
import json

# Replace these with your actual values
AZURE_OPENAI_API_KEY = "1wz6aSGolw8nYZVA9igvMkznJoRAKwto8CF6xCgiySlPrpkM3oHnJQQJ99BHACHYHv6XJ3w3AAAAACOGvXau"
AZURE_OPENAI_ENDPOINT = "https://admin-mdubn74y-eastus2.cognitiveservices.azure.com"
AZURE_OPENAI_DEPLOYMENT_NAME = "gpt-35-turbo"  # Example: "gpt35"

client = openai.AzureOpenAI(
    api_key=AZURE_OPENAI_API_KEY,
    api_version="2025-01-01-preview",
    azure_endpoint=AZURE_OPENAI_ENDPOINT
)

# Replace with your Azure deployment name for GPT-35-Turbo or GPT-4
deployment_name = AZURE_OPENAI_DEPLOYMENT_NAME


def generate_sql(question, params= ""):
    prompt = f"""
        You are a SQL expert. Based on the following database schema, write a valid MSSQL query.

        Schema:
        Tables and relations:
        1. ProjectRequest(RequestID, RequestFromEmpID, Brand,  RequestCode, ProjectID, RequestType, Module, AllocateHours, ScopeOfWork, ProjectStatus
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

        Only return the SQL query, without explanations.
        Only return the SQL statement — **do not include any explanation or markdown formatting like ```sql**.
        - Do **NOT** use any markdown formatting like ```sql or ```  or new lines symbol.
            Output a JSON object with:
        - "intent": string (the detected intent)
        - "sql": string (the MSSQL query without markdown formatting)
        - "parameters": object (key-value pairs of detected parameters)
        Example:
            {{"intent": "pending_approval_gt_15_days", "parameters": {{"cr_number": "456"}}, "sql": "SELECT ..."}}
        """

    response = client.chat.completions.create(
        model=deployment_name,
        messages=[{"role": "user", "content": prompt}]
    )

    try:
        output = json.loads(response.choices[0].message.content.strip())
        return {
            "sql": output.get("sql"),
            "intent": output.get("intent"),
            "parameters": output.get("parameters", {})
        }
    except json.JSONDecodeError:
        # If GPT fails to return proper JSON, fallback to raw SQL only
        return {
            "sql": response.choices[0].message.content.strip(),
            "intent": None,
            "parameters": {}
        }