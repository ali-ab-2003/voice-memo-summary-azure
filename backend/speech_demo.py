import os
from dotenv import load_dotenv
import azure.cognitiveservices.speech as speechsdk

load_dotenv()

speech_key = os.getenv("AZURE_SPEECH_KEY")
speech_region = os.getenv("AZURE_SPEECH_REGION")

speech_config = speechsdk.SpeechConfig(
    subscription=speech_key, region=speech_region
)

audio_filename = "sample-1.m4a"
print("Current working directory:", os.getcwd())
print("File exists:", os.path.isfile(audio_filename))

audio_config = speechsdk.audio.AudioConfig(
    filename=audio_filename
)

recognizer = speechsdk.SpeechRecognizer(
    speech_config=speech_config, audio_config=audio_config
)

print("Recognizing speech from audio file...")
result = recognizer.recognize_once()

if result.reason == speechsdk.ResultReason.RecognizedSpeech:
    print("Recognized: {}".format(result.text))
elif result.reason == speechsdk.ResultReason.NoMatch:
    print("No speech could be recognized.")
elif result.reason == speechsdk.ResultReason.Canceled:
    cancellation_details = result.cancellation_details
    print("Speech Recognition canceled: {}".format(cancellation_details.reason))
    if cancellation_details.reason == speechsdk.CancellationReason.Error:
        print("Error occurred: {}".format(cancellation_details.error_details))