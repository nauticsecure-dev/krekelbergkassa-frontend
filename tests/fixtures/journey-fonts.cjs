// Offline font CSS for Next's font-test hook; keep a valid @font-face rule.
module.exports = new Proxy({}, {
  get: (_target, url) => `@font-face {
    font-family: '${String(url).includes('Cormorant') ? 'Cormorant Garamond' : 'Inter'}';
    font-style: normal;
    font-weight: 100 900;
    src: local('Arial');
  }`,
});
