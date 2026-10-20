import { handleIngest } from './_catalog-core.mjs';

export default async function handler(request) {
  return handleIngest(request);
}
