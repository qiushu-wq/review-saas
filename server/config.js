// Production config for Railway deployment
// Railway V2 runtime has a known bug where custom env vars are not injected.
// This file serves as a fallback until the Railway bug is fixed.
// TODO: Remove this file once Railway fixes V2 runtime variable injection.

module.exports = {
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || 'sk-decaca8340d4417db0443912119aa84f',
  jwtSecret: process.env.JWT_SECRET || 'my-jwt-secret-2026',
  adminKey: process.env.ADMIN_KEY || 'Aa12211',
}
