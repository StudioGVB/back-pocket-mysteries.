const { buildAvatarUrl } = require('./src/utils/avatar.js');
console.log(buildAvatarUrl({
  "top": "none",
  "seed": "player",
  "hairColor": "282828",
  "skinColor": "ffcd94",
  "accessories": "none"
}, "Batchbase Batchbase"));
