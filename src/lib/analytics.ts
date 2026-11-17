type EventParams = Record<string, string | number | boolean>;

// Analytics is disabled. Call sites are kept so a provider can be wired in here later.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function trackEvent(eventName: string, params?: EventParams) {}
