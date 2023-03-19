const validUrlChunks = ['/c/', '/channel/', '/user/', '/@', '/watch?v='];
const isValidUrl = (url) => validUrlChunks.some((chunk) => url.includes(chunk));

const replaceProtocol = (url) => url.replace('http:', 'https:');

const extractString = ({ bodyText, startString, endString }) => (
  bodyText.match(`(?<=${startString}).*?(?=${endString})`)[0] || null
);

let fetchController = new AbortController();

const abortPreviousFetch = () => {
  fetchController.abort();
  fetchController = new AbortController();
};

const getChannelUrl = (videoUrl) => {
  const { signal } = fetchController;

  return (
    fetch(videoUrl, { signal })
      .then((response) => response.text())
      .then((bodyText) => {
        const channelUrl = extractString({
          bodyText,
          startString: '@id": "',
          endString: '"',
        });

        return replaceProtocol(channelUrl);
      })
      .catch(() => null)
  );
};

const checkIsMonetized = async (url, isVideoPageUrl) => {
  const { signal } = fetchController;
  const channelUrl = isVideoPageUrl ? await getChannelUrl(url) : url;

  return (
    fetch(channelUrl, { signal })
      .then((response) => response.text())
      .then((bodyText) => {
        const monetizationStatusString = extractString({
          bodyText,
          startString: '"is_monetization_enabled","value":"',
          endString: '"',
        });
      
        return JSON.parse(monetizationStatusString);
      })
      .catch(() => null)
  );
};

const getSubscriberCountElement = (isVideoPageUrl) => new Promise((resolve) => {
  const observer = new MutationObserver(() => {
    const subscriberCountElementId = isVideoPageUrl ? 'owner-sub-count' : 'subscriber-count';
    const subscriberCountElement = document.getElementById(subscriberCountElementId);
  
    if (subscriberCountElement) {
      observer.disconnect();
      resolve(subscriberCountElement);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
});

const createMonetizationStatusLoadingElement = (isVideoPageUrl) => {
  const fontSize = isVideoPageUrl ? '1.2rem' : '1.4rem';
  const element = document.createElement('div');
  element.id = 'monetization-status';
  element.className = 'monetization-status-loading';
  element.style.cssText += `font-size: ${fontSize}; font-weight: 400; color: #ffff00`;
  element.textContent = 'Monetization status is loading';

  return element;
};

const insertMonetizationStatusLoadingElement = async (isVideoPageUrl) => {
  const subscriberCountElement = await getSubscriberCountElement(isVideoPageUrl);
  const monetizationStatusLoadingElement = createMonetizationStatusLoadingElement(isVideoPageUrl);

  document.getElementById('monetization-status')?.remove();
  subscriberCountElement.after(monetizationStatusLoadingElement);

  return monetizationStatusLoadingElement;
};

const updateMonetizationStatusElement = (monetizationStatusElement, isMonetized) => {
  const textColor = isMonetized ? '#4CBB17' : '#D22B2B';
  const monetizationStatusTextMap = new Map([
    [true, 'Channel is monetized'],
    [false, 'Channel is not monetized'],
    [null, 'Monetization status unknown'],
  ]);

  monetizationStatusElement.className = 'monetization-status-loaded';

  setTimeout(() => {
    monetizationStatusElement.style.cssText += `color: ${textColor}`;
    monetizationStatusElement.textContent = monetizationStatusTextMap.get(isMonetized);
  }, 500);
};

chrome.runtime.onMessage.addListener(async ({ url }) => {
  if (!isValidUrl(url)) return;
  abortPreviousFetch();

  const isVideoPageUrl = url.includes('watch?v=');
  const [isMonetized, monetizationStatusLoadingElement] = await Promise.all([
    checkIsMonetized(url, isVideoPageUrl),
    insertMonetizationStatusLoadingElement(isVideoPageUrl),
  ]);

  updateMonetizationStatusElement(monetizationStatusLoadingElement, isMonetized);
});
