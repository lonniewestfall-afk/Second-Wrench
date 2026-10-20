import { handleReferralAdmin } from './_referral-core.mjs';

export default async function handler(request) {
  return handleReferralAdmin(request);
}
