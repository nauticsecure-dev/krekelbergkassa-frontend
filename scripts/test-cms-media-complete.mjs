process.env.CMS_MEDIA_LIVE = '1';
process.env.CMS_MEDIA_COMPLETE = '1';
await import('./test-isolated-live.mjs');
