const replaceProtocol = (url) => url.replace('http:', 'https:');

const extractString = ({ bodyText, startString, endString }) => (
  bodyText.match(`(?<=${startString}).*?(?=${endString})`)[0] || null
);

let fetchController = new AbortController();

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

const createMonetizationStatusElement = (isMonetized, isVideoPageUrl) => {
  const monetizationStatusText = isMonetized ? 'Channel is monetized' : 'Channel is not monetized';
  const textColor = isMonetized ? '#4CBB17' : '#D22B2B';
  const fontSize = isVideoPageUrl ? '1.2rem' : '1.4rem';
  const style = `'font-size: ${fontSize}; font-weight: 400; color:${textColor}'`;

  return `<div id='monetization-status' style=${style}>${monetizationStatusText}</div>`;
};

chrome.runtime.onMessage.addListener(async ({ url }) => {
  fetchController.abort();
  fetchController = new AbortController();

  document.getElementById('monetization-status')?.remove();

  const isVideoPageUrl = url.includes('watch?v=');
  const [isMonetized, subscriberCountElement] = await Promise.all([
    checkIsMonetized(url, isVideoPageUrl),
    getSubscriberCountElement(isVideoPageUrl),
  ]);

  if (isMonetized === null) return;

  const monetizationStatusElement = createMonetizationStatusElement(isMonetized, isVideoPageUrl);
  subscriberCountElement.insertAdjacentHTML('afterEnd', monetizationStatusElement);
});
