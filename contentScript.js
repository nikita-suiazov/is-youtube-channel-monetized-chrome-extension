const validUrlChunks = ['/c/', '/channel/', '/user/', '/@', '/watch?v='];
const isValidUrl = (url) => validUrlChunks.some((chunk) => url.includes(chunk));
const replaceProtocol = (url) => url.replace('http:', 'https:');

const extractString = (text, [startString, endString]) => (
  text.match(`(?<=${startString}).*?(?=${endString})`)[0] || null
);

let fetchController = new AbortController();

const extractStringFromResponseBody = ({ url, betweenStrings }) => (
  fetch(url, { signal: fetchController.signal })
    .then((response) => response.text())
    .then((bodyText) => extractString(bodyText, betweenStrings))
    .catch(() => null)
);

const getChannelUrl = (url) => {
  const channelUrlString = extractStringFromResponseBody({ url, betweenStrings: ['@id": "', '"'] });

  return replaceProtocol(channelUrlString);
};

const checkIsMonetized = (url) => {
  const monetizationStatusString = extractStringFromResponseBody({ url, betweenStrings: ['"is_monetization_enabled","value":"', '"'] });

  return JSON.parse(monetizationStatusString);
};

const getChannelNameElement = (isVideoUrl) => new Promise((resolve) => {
  const observer = new MutationObserver(() => {
    const channelNameElementQuery = isVideoUrl ? '#owner #channel-name' : '#inner-header-container #channel-name';
    const channelNameElement = document.querySelector(channelNameElementQuery);
  
    if (channelNameElement) {
      observer.disconnect();
      resolve(channelNameElement);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
});

const createMonetizationStatusLoadingElement = (isVideoUrl) => {
  const fontSize = isVideoUrl ? '1.2rem' : '1.4rem';

  const element = document.createElement('div');
  element.id = 'monetization-status';
  element.className = 'monetization-status-loading';
  element.style.cssText += `font-size: ${fontSize}; font-weight: 400; color: #ffff00`;
  element.textContent = 'Monetization status is loading';

  return element;
};

const insertMonetizationStatusLoadingElement = async (isVideoUrl) => {
  const channelNameElement = await getChannelNameElement(isVideoUrl);
  const monetizationStatusLoadingElement = createMonetizationStatusLoadingElement(isVideoUrl);

  document.getElementById('monetization-status')?.remove();

  channelNameElement.after(monetizationStatusLoadingElement);

  return monetizationStatusLoadingElement;
};

const monetizationStatusTextMap = new Map([
  [true, 'Channel is monetized'],
  [false, 'Channel is not monetized'],
  [null, 'Monetization status unknown'],
]);

const updateMonetizationStatusElement = (monetizationStatusElement, isMonetized) => {
  const textColor = isMonetized ? '#4CBB17' : '#D22B2B';
  monetizationStatusElement.className = 'monetization-status-loaded';

  setTimeout(() => {
    monetizationStatusElement.style.cssText += `color: ${textColor}`;
    monetizationStatusElement.textContent = monetizationStatusTextMap.get(isMonetized);
  }, 500);
};

const abortPreviousFetch = () => {
  fetchController.abort();
  fetchController = new AbortController();
};

chrome.runtime.onMessage.addListener(async ({ url }) => {
  if (!isValidUrl(url)) return;
  abortPreviousFetch();

  const isVideoUrl = url.includes('watch?v=');
  const channelUrl = isVideoUrl ? await getChannelUrl(url) : url;

  const [isMonetized, monetizationStatusLoadingElement] = await Promise.all([
    checkIsMonetized(channelUrl),
    insertMonetizationStatusLoadingElement(isVideoUrl),
  ]);

  updateMonetizationStatusElement(monetizationStatusLoadingElement, isMonetized);
});
