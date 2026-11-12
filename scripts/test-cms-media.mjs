// Own one isolated server lifecycle for reliable Windows teardown.
process.env.CMS_MEDIA_LIVE = '1';
process.env.CMS_MEDIA_COMPLETE = '0';
process.env.CMS_MEDIA_FIXTURES = '1';
await import('./test-isolated-live.mjs');
