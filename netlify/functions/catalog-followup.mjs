import { handleFollowup } from './_catalog-core.mjs';

export default async function handler(request) {
  return handleFollowup(request);
}