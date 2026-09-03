// Vercel Serverless Function entry point for Choicer Voicer
const app = require('../server.js');

module.exports = (req, res) => {
  return app(req, res);
};
