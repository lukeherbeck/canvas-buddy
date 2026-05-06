export const DEV_TOOLS_STORAGE_KEY = "canvasbuddy_dev_tools_enabled";

export type DevToolsVisibilityInput = {
  readonly viteDev: boolean;
  readonly storedPreference: boolean;
};

export function shouldShowDevTools(input: DevToolsVisibilityInput): boolean {
  return input.viteDev && input.storedPreference;
}
