const esbuild = require("esbuild");

const BANNER = `// ==UserScript==
// @name BC Games
// @namespace https://www.bondageprojects.com/
// @version 1.0.0
// @description BC games
// @author elliethepink
// @match https://bondageprojects.elementfx.com/*
// @match https://www.bondageprojects.elementfx.com/*
// @match https://bondage-europe.com/*
// @match https://www.bondage-europe.com/*
// @match http://localhost:*/*
// @grant none
// @run-at document-end
// ==/UserScript==

`;

esbuild.build({
  entryPoints: ['src/bot.ts'],
  bundle: true,
  banner: {
    js: BANNER,
  },
  outfile: 'out/bundle.js',
})
