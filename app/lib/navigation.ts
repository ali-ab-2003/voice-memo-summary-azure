/**
 * Navigation type definitions shared between the navigator and screens.
 *
 * Kept in its own module so screens can import the param list without creating
 * a circular dependency with App.tsx.
 */
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { ProcessResult } from "./api";

export type RootStackParamList = {
  Record: undefined;
  Result: { result: ProcessResult };
};

export type RecordScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "Record"
>;

export type ResultScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "Result"
>;
