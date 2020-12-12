var router = require('express').Router()
const express = require('express')
const GoogleSpreadsheet = require('google-spreadsheet')
const path = require('path')
const https = require('https')
const { promisify } = require('util')
var bodyParser = require('body-parser')
router.use(bodyParser.json())
const port = 5000
const qs = require('querystring');
const session = require('express-session')

const creds = require('../client_secret.json')

const parseUrl = express.urlencoded({ extended: false })
const parseJson = express.json({ extended: false })

const checksum_lib = require('../Paytm/checksum')
const config = require('../Paytm/config')
const doc = new GoogleSpreadsheet('1Soz7ug5QUed2iIypJ15KYCFOkKoIYmpwa7ahEHg34TQ')

//express session middleware
router.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 60000 }
}));

router.post('/amount', async (req, res) => {

  await promisify(doc.useServiceAccountAuth)(creds)

  const info = await promisify(doc.getInfo)()
  const sheet = info.worksheets[0]

  var date = new Date()
  var month = date.getMonth() + 1

  var paymentDetails = {
    name: req.body.name,
    email: req.body.email,
    mobilenumber: req.body.mobilenumber,
    service: req.body.service,
    payment: req.body.payment,
    date: req.body.date,
    bookingdate: date.getDate() + '/' + month + '/' + date.getFullYear(),
    amountpaid: 0
  }

  req.session.paynow = paymentDetails

  if (paymentDetails.payment == 'Pay later') {
    await promisify(sheet.addRow)(paymentDetails)
    res.render('success.ejs', {name: paymentDetails.name} )
  } else {
    res.render('payment.ejs')
  }
})

router.post('/paynow',[parseUrl, parseJson], (req, res) => {

  var amount = req.body.amount
  var paymentDetails = req.session.paynow
  console.log(paymentDetails)

  if( amount < 500 ) {
      res.render('payment.ejs', {msg: "The amount can't be less than 500"})
  } else {
      var params = {};
      params['MID'] = config.PaytmConfig.mid;
      params['WEBSITE'] = config.PaytmConfig.website;
      params['CHANNEL_ID'] = 'WEB';
      params['INDUSTRY_TYPE_ID'] = 'Retail';
      params['ORDER_ID'] = 'TEST_'  + new Date().getTime();
      params['CUST_ID'] = 'CUST_' + new Date().getTime();
      params['TXN_AMOUNT'] = amount;
      params['CALLBACK_URL'] = 'https://vvstudio.varvadhustudio.com/callback';
      params['EMAIL'] = paymentDetails.email;
      params['MOBILE_NO'] = paymentDetails.mobilenumber;


      checksum_lib.genchecksum(params, config.PaytmConfig.key, function (err, checksum) {
          //var txn_url = "https://securegw-stage.paytm.in/theia/processTransaction"; // for staging
          var txn_url = "https://securegw.paytm.in/theia/processTransaction"; // for production

          var form_fields = "";
          for (var x in params) {
              form_fields += "<input type='hidden' name='" + x + "' value='" + params[x] + "' >";
          }
          form_fields += "<input type='hidden' name='CHECKSUMHASH' value='" + checksum + "' >";

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.write('<html><head><title>Merchant Checkout Page</title></head><body><center><h1>Please do not refresh this page...</h1></center><form method="post" action="' + txn_url + '" name="f1">' + form_fields + '</form><script type="text/javascript">document.f1.submit();</script></body></html>');
          res.end();
      });
  }
})

router.post('/callback', (req, res) => {
  var post_data = req.body;

  // received params in callback
  console.log('Callback Response: ', post_data, "\n");


  // verify the checksum
  var checksumhash = post_data.CHECKSUMHASH;
  // delete post_data.CHECKSUMHASH;
  var result = checksum_lib.verifychecksum(post_data, config.PaytmConfig.key, checksumhash);
  console.log("Checksum Result => ", result, "\n");


  // Send Server-to-Server request to verify Order Status
  var params = {"MID": config.PaytmConfig.mid, "ORDERID": post_data.ORDERID};

  checksum_lib.genchecksum(params, config.PaytmConfig.key, function (err, checksum) {

  params.CHECKSUMHASH = checksum;
  post_data = 'JsonData='+JSON.stringify(params);

  var options = {
    //hostname: 'securegw-stage.paytm.in', // for staging
    hostname: 'securegw.paytm.in', // for production
    port: 443,
    path: '/merchant-status/getTxnStatus',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': post_data.length
    }
  };


  // Set up the request
  var response = "";
  var post_req = https.request(options, function(post_res) {
    post_res.on('data', function (chunk) {
      response += chunk;
    });

    post_res.on('end', async function(){
      console.log('S2S Response: ', response, "\n");

      //spreadsheet
      await promisify(doc.useServiceAccountAuth)(creds)

      const info = await promisify(doc.getInfo)()
      const sheet = info.worksheets[0]

      var _result = JSON.parse(response);
        if(_result.STATUS == 'TXN_SUCCESS') {
            var paymentDetails = req.session.paynow
            paymentDetails.amountpaid = _result.TXNAMOUNT
            console.log(paymentDetails)
            await promisify(sheet.addRow)(paymentDetails)
            res.render('success.ejs', {name: paymentDetails.name})
        }else {
            res.render('failure.ejs')
        }
      });
  });

  // post the data
  post_req.write(post_data);
  post_req.end();
  });
})

module.exports = router
