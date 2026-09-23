/* Public configuration. Never place passwords, tokens, or API keys in this file. */
window.SW_CONFIG = Object.freeze({
  version: '0.1.0-beta',
  contentVersion: '2026-09-23.1',
  domain: 'secondwrench.co',
  contactEmail: 'lonnie@secondwrench.co',
  operatorName: 'Second Wrench',
  termsVersion: 'beta-2026-09-13',
  // Turn on only after Netlify detects both forms and you verify a test submission.
  formsEnabled: false,
  // No advanced electrical repair procedures are shipped in this release.
  advancedRepairsEnabled: false,
  releaseChecks: {
    operatorDetailsConfirmed: false,
    contactEmailApproved: true,
    termsAndPrivacyReviewed: false,
    hvacContentReviewed: false,
    liveFormsVerified: false
  }
});
