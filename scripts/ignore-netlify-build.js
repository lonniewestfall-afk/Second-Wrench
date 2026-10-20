'use strict';
// Exit 0 cancels a build; exit 1 proceeds.
// Production builds on main. Deploy previews build so a pull request can be checked before merge.
const preview=process.env.CONTEXT==='deploy-preview';
const production=process.env.CONTEXT==='production'&&process.env.BRANCH==='main';
process.exitCode=preview||production?1:0;
