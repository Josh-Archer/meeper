export async function captureTabScreenshot(tabId: number): Promise<string> {
  const tab = await chrome.tabs.get(tabId);
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(
      tab.windowId,
      { format: "png" },
      (dataUrl) => {
        if (chrome.runtime.lastError || !dataUrl) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(dataUrl);
      },
    );
  });
}
