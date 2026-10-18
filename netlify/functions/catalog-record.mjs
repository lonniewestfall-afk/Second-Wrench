import { handleRecord } from './_catalog-core.mjs';

export default async function handler(request) {
  return handleRecord(request);
}
