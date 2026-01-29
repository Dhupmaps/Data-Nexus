import os
import time
import uuid  #For unique IDs
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_pinecone import PineconeVectorStore
from pydantic import BaseModel, Field
from pinecone import Pinecone, ServerlessSpec

load_dotenv()

class PolicySchema(BaseModel):
    general_meal_limit: float = Field(description="Standard limit for personal meals")
    team_meal_limit: float = Field(description="Limit for team dinners/lunches. Look for '$150'")
    client_meal_limit: float = Field(description="Limit for client dining. If unlimited, put -1 or 99999")
    max_flight_cost: float = Field(description="Max allowed USD for flights")

def pdf_extraction_node(state):
    print("--- PDF AGENT: Processing Policy ---")
    
    openai_key = os.getenv("OPENAI_API_KEY")
    pinecone_key = os.getenv("PINECONE_API_KEY")

    if not openai_key or not pinecone_key:
        return {"messages": ["ERROR: Keys missing."]}

    # CREATE UNIQUE INDEX
    # We create a random index name
    # This guarantees 0% chance of reading old data
    run_id = str(uuid.uuid4())[:8]
    index_name = f"policy-runner-{run_id}"
    
    pc = Pinecone(api_key=pinecone_key)
    print(f" Creating fresh memory space: {index_name}")
    
    pc.create_index(
        name=index_name,
        dimension=1536, 
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1")
    )
    # Wait for Pinecone to be ready (Critical)
    while not pc.describe_index(index_name).status['ready']:
        time.sleep(1)

    try:
        #1. Load PDF
        loader = PyPDFLoader(state["policy_path"])
        docs = loader.load()
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        splits = splitter.split_documents(docs)
        
        #2. Embed & Store
        embeddings = OpenAIEmbeddings(model="text-embedding-ada-002", openai_api_key=openai_key)
        
        vectorstore = PineconeVectorStore.from_documents(
            documents=splits, 
            embedding=embeddings, 
            index_name=index_name,
            pinecone_api_key=pinecone_key
        )
        
        #3. Retrieve & Extract
        retriever = vectorstore.as_retriever()
        
        query = "What is the specific dollar limit for Team Dinner/Lunch? What is the limit for Client Dinner?"
        relevant_docs = retriever.invoke(query)
        context = "\n".join([d.page_content for d in relevant_docs])
        
        print(f"DEBUG - AI Context Found:\n{context}\n")

        #4. LLM Extraction
        llm = ChatOpenAI(model="gpt-4-turbo", temperature=0, api_key=openai_key)
        structured_llm = llm.with_structured_output(PolicySchema)
        
        rules = structured_llm.invoke(f"Extract policy limits. Context: {context}")
        
        return {
            "policy_rules": rules.dict(), 
            "messages": [f"Policy extracted from fresh index {index_name}. Team Limit: ${rules.team_meal_limit}"]
        }

    finally:
        #5. Cleanup
        print(f" Deleting temp index: {index_name}")
        pc.delete_index(index_name)