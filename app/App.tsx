import { SafeAreaProvider } from "react-native-safe-area-context";

import RecordScreen from "./screens/RecordScreen";

export default function App() {
  return (
    <SafeAreaProvider>
      <RecordScreen />
    </SafeAreaProvider>
  );
}
