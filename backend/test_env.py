from dotenv import load_dotenv
import os

load_dotenv()

print("AZURE_SPEECH_KEY:", os.getenv("AZURE_SPEECH_KEY"))
print("AZURE_SPEECH_REGION:", os.getenv("AZURE_SPEECH_REGION"))
print("AZURE_LANGUAGE_KEY:", os.getenv("AZURE_LANGUAGE_KEY"))
print("AZURE_LANGUAGE_ENDPOINT:", os.getenv("AZURE_LANGUAGE_ENDPOINT"))