/**
 * RecordScreen tests — expo-audio is fully mocked, so no native modules,
 * microphone, or audio files are touched. Verifies the record → stop → play
 * flow and the key error paths.
 */
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import RecordScreen from "../screens/RecordScreen";
import { AudioModule, createAudioPlayer, useAudioRecorder } from "expo-audio";

// --- Mock expo-audio -------------------------------------------------------
jest.mock("expo-audio", () => {
  const recorder = {
    prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
    record: jest.fn(),
    stop: jest.fn().mockResolvedValue(undefined),
    uri: "file:///tmp/recording.m4a",
  };
  const player = {
    play: jest.fn(),
    remove: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  };
  return {
    useAudioRecorder: jest.fn(() => recorder),
    AudioModule: {
      requestRecordingPermissionsAsync: jest
        .fn()
        .mockResolvedValue({ granted: true }),
    },
    RecordingPresets: { HIGH_QUALITY: {} },
    IOSOutputFormat: { LINEARPCM: "lpcm" },
    AudioQuality: { HIGH: 96 },
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    createAudioPlayer: jest.fn(() => player),
  };
});

// Safe area context ships a jest mock that renders children without insets.
jest.mock("react-native-safe-area-context", () =>
  require("react-native-safe-area-context/jest/mock").default
);

// expo-status-bar renders nothing meaningful in tests.
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));

const mockedAudioModule = AudioModule as unknown as {
  requestRecordingPermissionsAsync: jest.Mock;
};
const mockedUseAudioRecorder = useAudioRecorder as unknown as jest.Mock;
const mockedCreateAudioPlayer = createAudioPlayer as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockedAudioModule.requestRecordingPermissionsAsync.mockResolvedValue({
    granted: true,
  });
});

// Minimal navigation/route stub so RecordScreen can render in isolation.
// (Full navigation behaviour is covered in Phase 4.)
import type { RecordScreenProps } from "../lib/navigation";

const navProps = {
  navigation: { navigate: jest.fn() },
  route: { key: "Record", name: "Record", params: undefined },
} as unknown as RecordScreenProps;

describe("RecordScreen", () => {
  it("renders the title and an initial ready state", () => {
    const { getByText } = render(<RecordScreen {...navProps} />);
    expect(getByText("VoiceNote AI")).toBeTruthy();
    expect(getByText("Ready to record")).toBeTruthy();
    expect(getByText("Start Recording")).toBeTruthy();
  });

  it("supports the record → stop → play flow", async () => {
    const { getByText, queryByText } = render(<RecordScreen {...navProps} />);

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
      expect(mockedCreateAudioPlayer).toHaveBeenCalledWith({
        uri: "file:///tmp/recording.m4a",
      })
    );

    expect(queryByText(/required|Unable|No recording/)).toBeNull();
  });

  it("shows an error when microphone permission is denied", async () => {
    mockedAudioModule.requestRecordingPermissionsAsync.mockResolvedValueOnce({
      granted: false,
    });
    const { getByText } = render(<RecordScreen {...navProps} />);

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
    const recorder = mockedUseAudioRecorder();
    recorder.prepareToRecordAsync.mockRejectedValueOnce(
      new Error("native failure")
    );
    const { getByText } = render(<RecordScreen {...navProps} />);

    fireEvent.press(getByText("Start Recording"));

    await waitFor(() =>
      expect(getByText("Unable to start recording.")).toBeTruthy()
    );
  });
});
