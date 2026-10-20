import { handleProSignup } from './_pro-signup.mjs';

export default async function handler(request) {
  return handleProSignup(request);
}
