import os
import time
import random
import asyncio
from typing import Dict, List, Optional
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from dotenv import load_dotenv
import logging
from datetime import datetime, timedelta
import json
import aiofiles
import aiofiles.os as async_os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# --- Configure Gemini API ---
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("GOOGLE_API_KEY not found in .env file")
    
genai.configure(api_key=api_key)
logger.info("✅ Gemini API configured")

# Model options
MODEL_OPTIONS = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-flash-latest',
    'gemini-pro-latest',
]

# Safety settings
safety_settings = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"}
]

# Model initialization
model = None
selected_model_name = None
for model_name in MODEL_OPTIONS:
    try:
        test_model = genai.GenerativeModel(model_name, safety_settings=safety_settings)
        model = test_model
        selected_model_name = model_name
        logger.info(f"✅ Successfully loaded model: {selected_model_name}")
        break
    except Exception as e:
        logger.warning(f"⚠️ Model {model_name} not available: {str(e)[:80]}")
        continue

if model is None:
    error_msg = "❌ No Gemini models available. Check API key at https://aistudio.google.com"
    logger.error(error_msg)
    raise ValueError(error_msg)

# --- Chat History Persistence ---
CHAT_HISTORY_FILE = "chat_history.json"
conversation_history: Dict[str, List[Dict[str, str]]] = {}
MAX_USERS = 1000
MAX_MESSAGES_PER_USER = 30
MAX_FILE_SIZE_MB = 100

# File lock for async operations
file_lock = asyncio.Lock()

# --- Crisis Detection ---
CRISIS_KEYWORDS = [
    'suicide', 'kill myself', 'end my life', 'want to die', 
    'self harm', 'hurt myself', 'no reason to live', 'give up'
]

CRISIS_RESPONSE = (
    "I'm really concerned about what you're sharing. Your safety is the most important thing. "
    "Please reach out to a mental health professional or crisis helpline immediately:\n\n"
    "🇮🇳 India: AASRA - 9820466726 (24/7) | iCall - 9152987821\n"
    "🌍 International: findahelpline.com\n\n"
    "You don't have to face this alone. Please talk to someone who can help right away."
)

# --- Retry Logic ---
class RetryHandler:
    def __init__(self, max_retries: int = 3, base_delay: float = 1, max_delay: float = 10):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
    
    def execute_with_retry(self, func, *args, **kwargs):
        last_exception = None
        for attempt in range(self.max_retries):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                error_str = str(e).lower()
                is_rate_limit = any(keyword in error_str for keyword in 
                                    ['429', 'resource_exhausted', 'quota', 'rate_limit', 'too_many_requests'])
                
                if is_rate_limit:
                    if attempt == self.max_retries - 1:
                        logger.error(f"Max retries ({self.max_retries}) reached for rate limit")
                        raise HTTPException(status_code=429, detail="AI service is busy. Please try again in a moment.")
                    
                    delay = min(self.base_delay * (2 ** attempt) + random.uniform(0, 1), self.max_delay)
                    logger.warning(f"Rate limited. Retry {attempt + 1}/{self.max_retries} after {delay:.2f}s")
                    time.sleep(delay)
                else:
                    logger.error(f"Non-retryable error (attempt {attempt + 1}): {str(e)[:100]}")
                    raise
        raise last_exception

retry_handler = RetryHandler(max_retries=3, base_delay=1, max_delay=8)

# --- File Operations ---
async def load_chat_history():
    """Load chat history from JSON file on startup."""
    global conversation_history
    async with file_lock:
        if not await async_os.path.exists(CHAT_HISTORY_FILE):
            logger.info(f"'{CHAT_HISTORY_FILE}' not found, starting with empty history.")
            conversation_history = {}
            return

        try:
            async with aiofiles.open(CHAT_HISTORY_FILE, mode='r', encoding='utf-8') as f:
                content = await f.read()
                if content:
                    try:
                        conversation_history = json.loads(content)
                        logger.info(f"✅ Successfully loaded chat history for {len(conversation_history)} users.")
                    except json.JSONDecodeError:
                        logger.error(f"❌ JSON corrupted in '{CHAT_HISTORY_FILE}'. Starting fresh.")
                        conversation_history = {}
                        # Backup corrupted file
                        backup_file = f"{CHAT_HISTORY_FILE}.corrupted_{datetime.now().timestamp()}"
                        async with aiofiles.open(backup_file, mode='w') as backup:
                            await backup.write(content)
                        logger.info(f"⚠️ Backed up corrupted file to {backup_file}")
                else:
                    logger.info("History file is empty, starting fresh.")
                    conversation_history = {}
        except Exception as e:
            logger.error(f"❌ Error loading '{CHAT_HISTORY_FILE}': {e}. Starting with empty history.")
            conversation_history = {}

async def save_chat_history():
    """Save conversation history to JSON file with backup."""
    async with file_lock:
        try:
            # Create backup first
            if await async_os.path.exists(CHAT_HISTORY_FILE):
                try:
                    backup_file = f"{CHAT_HISTORY_FILE}.backup"
                    async with aiofiles.open(CHAT_HISTORY_FILE, mode='r') as f:
                        content = await f.read()
                    async with aiofiles.open(backup_file, mode='w') as f:
                        await f.write(content)
                except Exception as e:
                    logger.warning(f"⚠️ Could not create backup: {e}")
            
            # Write new data
            async with aiofiles.open(CHAT_HISTORY_FILE, mode='w', encoding='utf-8') as f:
                await f.write(json.dumps(conversation_history, indent=2))
            logger.debug(f"💾 Chat history saved ({len(conversation_history)} users)")
        except Exception as e:
            logger.error(f"❌ Error saving chat history to '{CHAT_HISTORY_FILE}': {e}")

async def check_file_size():
    """Check file size and warn if too large."""
    if await async_os.path.exists(CHAT_HISTORY_FILE):
        try:
            file_size = os.path.getsize(CHAT_HISTORY_FILE)
            size_mb = file_size / (1024 * 1024)
            
            if size_mb > MAX_FILE_SIZE_MB:
                logger.warning(f"⚠️ Chat history file is {size_mb:.2f} MB (limit: {MAX_FILE_SIZE_MB}MB)")
            else:
                logger.info(f"📊 Chat history file size: {size_mb:.2f} MB")
        except Exception as e:
            logger.error(f"❌ Error checking file size: {e}")

async def cleanup_old_messages():
    """Remove messages older than 30 days."""
    cutoff_time = datetime.now() - timedelta(days=30)
    cleaned_count = 0
    
    for user in list(conversation_history.keys()):
        try:
            original_count = len(conversation_history[user])
            filtered = [
                msg for msg in conversation_history[user]
                if datetime.fromisoformat(msg['timestamp']) > cutoff_time
            ]
            
            if len(filtered) < original_count:
                cleaned_count += original_count - len(filtered)
                conversation_history[user] = filtered
                logger.info(f"🧹 Cleaned {original_count - len(filtered)} old messages for {user}")
            
            if not conversation_history[user]:
                del conversation_history[user]
                logger.info(f"🗑️ Removed empty user: {user}")
        except Exception as e:
            logger.error(f"❌ Error cleaning messages for {user}: {e}")
    
    if cleaned_count > 0:
        await save_chat_history()
        logger.info(f"✅ Cleanup complete: {cleaned_count} messages removed")

# --- Pydantic Models ---
class ChatInput(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000, description="User message")
    userName: str = Field(..., min_length=1, max_length=50, description="Username")
    
    @validator('message')
    def message_not_empty(cls, v):
        if not v.strip():
            raise ValueError('Message cannot be empty or whitespace only')
        return v.strip()
    
    @validator('userName')
    def username_valid(cls, v):
        if not v.strip():
            raise ValueError('Username cannot be empty')
        if not all(c.isalnum() or c in ' -_' for c in v):
            raise ValueError('Username can only contain letters, numbers, spaces, hyphens, underscores')
        return v.strip()

class ChatResponse(BaseModel):
    response: str = Field(..., description="AI response message")
    timestamp: str = Field(..., description="Response timestamp")
    is_crisis: bool = Field(False, description="Whether crisis was detected")
    model: str = Field(..., description="Model used for response")

class HistoryMessage(BaseModel):
    role: str
    content: str
    timestamp: str

class HistoryResponse(BaseModel):
    userName: str
    messages: List[HistoryMessage]
    total_messages: int

# --- FastAPI Setup ---
app = FastAPI(
    title="Mental Wellness AI Companion API",
    description="🌟 Empathetic mental health support powered by Gemini",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Session-ID"], # <-- ADD IT HERE
)
# --- Helper Functions ---
def detect_crisis(message: str) -> bool:
    """Detect crisis keywords"""
    message_lower = message.lower()
    message_clean = ''.join(c if c.isalnum() or c.isspace() else '' for c in message_lower)
    return any(keyword in message_clean for keyword in CRISIS_KEYWORDS)

def get_conversation_context(userName: str, max_messages: int = 6) -> str:
    """Get recent conversation history"""
    if userName not in conversation_history:
        return ""
    
    recent_messages = conversation_history[userName][-max_messages:]
    if not recent_messages:
        return ""
    
    context_parts = []
    for msg in recent_messages:
        prefix = "User" if msg['role'] == 'user' else "Wellness Bot"
        context_parts.append(f"{prefix}: {msg['content']}")
    
    context = "\n".join(context_parts)
    return f"\n\nConversation context:\n{context}\n" if context else ""

async def store_message(userName: str, role: str, content: str):
    """Store message and save to file"""
    if userName not in conversation_history:
        if len(conversation_history) >= MAX_USERS:
            logger.warning(f"⚠️ Max users ({MAX_USERS}) reached, clearing oldest user")
            oldest_user = next(iter(conversation_history))
            del conversation_history[oldest_user]
        
        conversation_history[userName] = []
    
    conversation_history[userName].append({
        'role': role,
        'content': content,
        'timestamp': datetime.now().isoformat()
    })
    
    if len(conversation_history[userName]) > MAX_MESSAGES_PER_USER:
        conversation_history[userName] = conversation_history[userName][-MAX_MESSAGES_PER_USER:]
        logger.info(f"Trimmed history for {userName} to {MAX_MESSAGES_PER_USER} messages")
    
    await save_chat_history()

def generate_ai_response(message: str, userName: str) -> str:
    """Generate AI response"""
    context = get_conversation_context(userName)
    
    prompt = (
        f"You are Wellness Bot, an empathetic AI mental health companion.\n"
        f"You're talking with {userName}.\n\n"
        f"IMPORTANT GUIDELINES:\n"
        f"- Be warm, compassionate, and genuinely empathetic\n"
        f"- Validate their feelings first, then offer perspective\n"
        f"- Keep responses concise (2-3 sentences)\n"
        f"- Use their name naturally (but not in every response)\n"
        f"- NEVER attempt to diagnose or prescribe treatment\n"
        f"- NEVER pretend to be a professional therapist\n"
        f"- If they mention serious mental health concerns, acknowledge and suggest professional help\n"
        f"- Ask gentle follow-up questions to show you care\n"
        f"{context}"
        f"\n{userName} just said: \"{message}\"\n\n"
        f"Your compassionate response:"
    )
    
    def _generate():
        response = model.generate_content(prompt)
        return response.text.strip()
    
    return retry_handler.execute_with_retry(_generate)

# --- API Endpoints ---
@app.get("/", tags=["Health"])
def read_root():
    """Health check endpoint"""
    return {
        "message": "🌟 Mental Wellness API is running!",
        "status": "healthy",
        "version": "1.0.0",
        "model": selected_model_name,
        "active_users": len(conversation_history),
        "max_users": MAX_USERS
    }

@app.get("/health", tags=["Health"])
def health_check():
    """Detailed health check"""
    return {
        "status": "ok",
        "model_loaded": selected_model_name is not None,
        "model_name": selected_model_name,
        "conversations_active": len(conversation_history),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/chat", response_model=ChatResponse, tags=["Chat"])
async def chat_with_ai(chat_input: ChatInput):
    """Main chat endpoint"""
    try:
        logger.info(f"📨 Message from {chat_input.userName}: {chat_input.message[:50]}...")
        
        await store_message(chat_input.userName, 'user', chat_input.message)
        
        # Crisis detection
        is_crisis = detect_crisis(chat_input.message)
        if is_crisis:
            logger.warning(f"🚨 CRISIS DETECTED for user: {chat_input.userName}")
            await store_message(chat_input.userName, 'assistant', CRISIS_RESPONSE)
            return ChatResponse(
                response=CRISIS_RESPONSE,
                timestamp=datetime.now().isoformat(),
                is_crisis=True,
                model=selected_model_name
            )
        
        # Generate response
        logger.info(f"🤖 Generating response for {chat_input.userName}...")
        ai_response = generate_ai_response(chat_input.message, chat_input.userName)
        
        await store_message(chat_input.userName, 'assistant', ai_response)
        
        logger.info(f"✅ Response sent to {chat_input.userName} ({len(ai_response)} chars)")
        
        return ChatResponse(
            response=ai_response,
            timestamp=datetime.now().isoformat(),
            is_crisis=False,
            model=selected_model_name
        )
        
    except HTTPException as http_ex:
        logger.error(f"❌ HTTP Error: {http_ex.detail}")
        raise http_ex
        
    except ValueError as val_err:
        logger.error(f"⚠️ Validation error: {val_err}")
        raise HTTPException(status_code=400, detail=str(val_err))
        
    except Exception as e:
        logger.error(f"💥 Unexpected error: {str(e)[:200]}", exc_info=True)
        
        error_response = (
            f"I'm sorry {chat_input.userName}, I'm having technical difficulties. "
            f"Please try again in a moment. Your message matters to me."
        )
        
        return ChatResponse(
            response=error_response,
            timestamp=datetime.now().isoformat(),
            is_crisis=False,
            model=selected_model_name
        )

@app.get("/history/{userName}", response_model=HistoryResponse, tags=["History"])
async def get_conversation_history(userName: str):
    """Get conversation history"""
    if userName not in conversation_history:
        return HistoryResponse(userName=userName, messages=[], total_messages=0)
    
    messages = [
        HistoryMessage(role=msg['role'], content=msg['content'], timestamp=msg['timestamp'])
        for msg in conversation_history[userName]
    ]
    
    return HistoryResponse(userName=userName, messages=messages, total_messages=len(messages))

@app.delete("/history/{userName}", tags=["History"])
async def clear_conversation_history(userName: str):
    """Clear history"""
    if userName in conversation_history:
        msg_count = len(conversation_history[userName])
        del conversation_history[userName]
        await save_chat_history()
        logger.info(f"🗑️ Cleared {msg_count} messages for {userName}")
        return {"message": f"Conversation history cleared for {userName}", "messages_cleared": msg_count}
    
    return {"message": f"No conversation history found for {userName}", "messages_cleared": 0}

@app.get("/export/{userName}", tags=["Admin"])
async def export_user_data(userName: str):
    """Export user conversation data"""
    if userName not in conversation_history:
        raise HTTPException(status_code=404, detail=f"No data for user {userName}")
    
    return {
        "userName": userName,
        "export_date": datetime.now().isoformat(),
        "message_count": len(conversation_history[userName]),
        "messages": conversation_history[userName]
    }

@app.get("/stats", tags=["Admin"])
async def get_stats():
    """Get API statistics"""
    total_messages = sum(len(msgs) for msgs in conversation_history.values())
    return {
        "active_conversations": len(conversation_history),
        "total_messages": total_messages,
        "max_users": MAX_USERS,
        "max_messages_per_user": MAX_MESSAGES_PER_USER,
        "model": selected_model_name,
        "timestamp": datetime.now().isoformat()
    }

# --- Startup & Shutdown Events ---
@app.on_event("startup")
async def startup_event():
    """Load history and validate on startup"""
    await load_chat_history()
    await check_file_size()
    await cleanup_old_messages()
    logger.info("="*60)
    logger.info("🚀 Mental Wellness API Starting")
    logger.info(f"Model: {selected_model_name}")
    logger.info(f"Max Users: {MAX_USERS}")
    logger.info(f"Loaded {len(conversation_history)} active users from history")
    logger.info("="*60)

@app.on_event("shutdown")
async def shutdown_event():
    """Graceful shutdown with final save"""
    logger.info("="*60)
    logger.info("🛑 Mental Wellness API Shutting Down")
    await save_chat_history()
    logger.info(f"✅ Saved {len(conversation_history)} conversations")
    logger.info("="*60)

# Run with: uvicorn main:app --reload
