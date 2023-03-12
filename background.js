const handleUrlChange = ({ frameType, tabId, url }) => {
  if (frameType === 'outermost_frame') {
    chrome.tabs.sendMessage(tabId, { url }).catch(() => {});
  }
};

chrome.webNavigation.onCompleted.addListener(handleUrlChange);
chrome.webNavigation.onHistoryStateUpdated.addListener(handleUrlChange);
