/**
 * RecordScreen tests — expo-av is fully mocked, so no native modules,
 * microphone, or audio files are touched. Verifies the record → stop → play
 * flow and the key error paths.
 */
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import RecordScreen from "../screens/RecordScreen";
import { Audio } from "expo-av";

// --- Mock expo-av ----------------------------------------------------------
jest.mock("expo-av", () => {
  const setOnPlaybackStatusUpdate = jest.fn();
  const sound = {
    setOnPlaybackStatusUpdate,
    unloadAsync: jest.fn().mockResolvedValue(undefined),
  };
  const recordingInstance = {
    stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
    getURI: jest.fn().mockReturnValue("file:///tmp/recording.m4a"),
  };
  return {
    Audio: {
      requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
      setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
      RecordingOptionsPresets: { HIGH_QUALITY: {} },
      Recording: {
        createAsync: jest
          .fn()
          .mockResolvedValue({ recording: recordingInstance }),
      },
      Sound: {
        createAsync: jest.fn().mockResolvedValue({ sound }),
      },
    },
    InterruptionModeIOS: { DoNotMix: 1 },
    InterruptionModeAndroid: { DoNotMix: 1 },
  };
});

// expo-status-bar renders nothing meaningful in tests.
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));

const mockedAudio = Audio as unknown as {
  requestPermissionsAsync: jest.Mock;
  Recording: { createAsync: jest.Mock };
  Sound: { createAsync: jest.Mock };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedAudio.requestPermissionsAsync.mockResolvedValue({ granted: true });
});

describe("RecordScreen", () => {
  it("renders the title and an initial ready state", () => {
    const { getByText } = render(<RecordScreen />);
    expect(getByText("VoiceNote AI")).toBeTruthy();
    expect(getByText("Ready to record")).toBeTruthy();
    expect(getByText("Start Recording")).toBeTruthy();
  });

  it("supports the record → stop → play flow", async () => {
    const { getByText, queryByText } = render(<RecordScreen />);

    // Start recording.
    fireEvent.press(getByText("Start Recording"));
    await waitFor(() => expect(getByText("Recording…")).toBeTruthy());
    expect(getByText("Stop Recording")).toBeTruthy();

    // Stop recording -> saved state.
    fireEvent.press(getByText("Stop Recording"));
    await waitFor(() => expect(getByText("Recording saved")).toBeTruthy());

    // Play recording loads the saved URI.
    fireEvent.press(getByText("Play Recording"));
    await waitFor(() =>
      expect(mockedAudio.Sound.createAsync).toHaveBeenCalledWith(
        { uri: "file:///tmp/recording.m4a" },
        { shouldPlay: true }
      )
    );

    expect(queryByText(/required|Unable|No recording/)).toBeNull();
  });

  it("shows an error when microphone permission is denied", async () => {
    mockedAudio.requestPermissionsAsync.mockResolvedValueOnce({
      granted: false,
    });
    const { getByText } = render(<RecordScreen />);

    fireEvent.press(getByText("Start Recording"));

    await waitFor(() =>
      expect(
        getByText("Microphone permission is required to record audio.")
      ).toBeTruthy()
    );
    // Still in ready state — recording never started.
    expect(getByText("Start Recording")).toBeTruthy();
  });

  it("surfaces a friendly error when recording fails to start", async () => {
    mockedAudio.Recording.createAsync.mockRejectedValueOnce(
      new Error("native failure")
    );
    const { getByText } = render(<RecordScreen />);

    fireEvent.press(getByText("Start Recording"));

    await waitFor(() =>
      expect(getByText("Unable to start recording.")).toBeTruthy()
    );
  });
});
