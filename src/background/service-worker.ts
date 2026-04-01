import { ext } from "../browser";

const ALARM_NAME = "canvasbuddy-todo-refresh";

ext.runtime.onInstalled.addListener(() => {
  ext.alarms.create(ALARM_NAME, { periodInMinutes: 15 });
});

ext.alarms.onAlarm.addListener((alarm: chrome.alarms.Alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  ext.tabs.query({}, (tabs: chrome.tabs.Tab[]) => {
    for (const tab of tabs) {
      if (tab.id !== undefined && tab.url !== undefined) {
        ext.tabs.sendMessage(tab.id, { type: "FETCH_TODO" }).catch(() => void 0);
      }
    }
  });
});
