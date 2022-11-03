const checkIsMonetized = async (url) => (
  fetch(url)
    .then((response) => response.text())
    .then((bodyText) => JSON.parse(
      bodyText.split('"is_monetization_enabled","value":"')[1].split('"')[0]
    ))
);

const createMonetizationStatusElement = async (url) => {
  const isMonetized = await checkIsMonetized(url);
  const monetizationStatusText = isMonetized ? 'Channel is monetized' : 'Channel is not monetized';
  const textColor = isMonetized ? '#4CBB17' : '#D22B2B';
  const style = `'font-size: 1.4rem; line-height: 2rem; font-weight: 400; color:${textColor}'`;

  return `<div id='monetization-status' style=${style}>${monetizationStatusText}</div>`;
};

chrome.runtime.onMessage.addListener(async ({ url }) => {
  document.getElementById('monetization-status')?.remove();

  const monetizationStatusElement = await createMonetizationStatusElement(url);
  const subscriberCountContainer = document.getElementById('subscriber-count');

  subscriberCountContainer.insertAdjacentHTML('afterEnd', monetizationStatusElement);
})
