import { handleProsJoin } from './_contractor-join.mjs';

export default async function handler(request) {
  return handleProsJoin(request);
}
