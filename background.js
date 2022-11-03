chrome.webNavigation.onCompleted.addListener(({ tabId, url, frameType }) => {
  if (frameType === 'outermost_frame') chrome.tabs.sendMessage(tabId, { url });
})

chrome.webNavigation.onHistoryStateUpdated.addListener(({ tabId, url: historyStateURL }) => {
  chrome.tabs.get(tabId, ({ url }) => {
    if (historyStateURL === url) chrome.tabs.sendMessage(tabId, { url });
  })
})
