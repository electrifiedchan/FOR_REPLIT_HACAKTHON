import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    print("❌ ERROR: GOOGLE_API_KEY not found in .env file")
    print("Make sure your .env file has: GOOGLE_API_KEY=your_actual_key")
    exit(1)

genai.configure(api_key=api_key)

print("\n" + "="*60)
print("Available models for generateContent:")
print("="*60)

try:
    models_found = False
    for model in genai.list_models():
        if 'generateContent' in model.supported_generation_methods:
            print(f"✅ {model.name}")
            models_found = True
    
    if not models_found:
        print("❌ No models found with generateContent support")
    
except Exception as e:
    print(f"❌ Error listing models: {e}")
    print("\nCheck that:")
    print("1. Your GOOGLE_API_KEY is correct")
    print("2. You're connected to internet")
    print("3. The key has API access enabled")

print("="*60 + "\n")
