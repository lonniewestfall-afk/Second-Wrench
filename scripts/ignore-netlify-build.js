'use strict';
// Save deploy credits: only the final production branch builds on Netlify.
// Exit 0 cancels a build; exit 1 proceeds. Tests and previews run locally.
process.exitCode=process.env.CONTEXT==='production'&&process.env.BRANCH==='main'?1:0;
