const LAST_CAMPAIGN_KEY = 'pokedm_last_campaign_id';

export function getLastCampaignId() {
  try {
    return localStorage.getItem(LAST_CAMPAIGN_KEY) || null;
  } catch {
    return null;
  }
}

export function setLastCampaignId(campaignId) {
  try {
    if (campaignId) {
      localStorage.setItem(LAST_CAMPAIGN_KEY, campaignId);
    }
  } catch {
    // Ignore storage failures (private browsing, quota, etc.)
  }
}

export function clearLastCampaignId() {
  try {
    localStorage.removeItem(LAST_CAMPAIGN_KEY);
  } catch {
    // Ignore
  }
}
