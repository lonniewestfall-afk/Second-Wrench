import { handleReferral } from './_referral-core.mjs';

export default async function handler(request) {
  return handleReferral(request);
}
