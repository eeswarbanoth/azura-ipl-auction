const mongoose = require('mongoose');
const Player = require('./models/Player');
console.log('--- Player Model Diagnostic ---');
console.log('Rating path options:', Player.schema.paths.rating.options);
console.log('Rating max:', Player.schema.paths.rating.options.max);
process.exit(0);
