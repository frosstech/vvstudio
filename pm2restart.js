var pm2 = require('pm2');

pm2.connect(function(err) {
  if (err) throw err;

  setTimeout(function worker() {
    console.log("Restarting app...");
    pm2.restart('index', function() {});
    setTimeout(worker, 60 * 5000);
  }, 60 * 5000);
});
