/* Public configuration. Never place passwords, tokens, or API keys in this file. */
window.SW_CONFIG = Object.freeze({
  version: '0.1.0-beta',
  contentVersion: '2026-10-20.10',
  privacyVersion: 'privacy-public-beta-2026-10-18.1',
  domain: 'secondwrench.co',
  contactEmail: 'support@secondwrench.co',
  operatorName: 'Second Wrench',
  termsVersion: 'public-beta-2026-10-20.1',
  // One homeowner reset of a tripped outdoor/AC breaker. Heat pumps never enter that step.
  breakerResetOnceEnabled: true,
  // Catalog capture stays off until this is set true. The server kill switch is separate and also defaults off.
  catalogEnabled: false,
  // Contractor referral stays off. Placeholder copy is not rendered while this is false.
  referralEnabled: false,
  catalogConsentVersion: 'cat-consent-2026-10-18.1',
  // Netlify detects beta-feedback and beta-session. liveFormsVerified stays false until a live test submission.
  formsEnabled: true,
  // Public runtime. Capacitor steps exist in the tree and run only when this is true.
  // Do not set true on main. The private sandbox zip is the only flag-on copy.
  advancedRepairsEnabled: false,
  aiThermostatEnabled: false,
  mirrorsEnabled: false,
  stageLatchStepsEnabled: false,
  releaseChecks: {
    operatorDetailsConfirmed: false,
    contactEmailApproved: true,
    termsAndPrivacyReviewed: false,
    hvacContentReviewed: false,
    liveFormsVerified: false
  }
});
