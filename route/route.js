var router = require('express').Router()
const GoogleSpreadsheet = require('google-spreadsheet')
const { promisify } = require('util')
var bodyParser = require('body-parser')
router.use(bodyParser.json())
const checksum_lib = require('./checksum')
var today = new Date()
const port = 3000
const qs = require('querystring');

const creds = require('../client_secret.json')

var PaytmConfig = {
	mid: "eQplcx57912286320175",
	key: "oiJiPd9q1o@PXzJC",
	website: "DEFAULT"
}


router.post("/check", async function (req, res) {
    const doc = new GoogleSpreadsheet('1EHLd__MfnXtgpoS5AinHECxH6agjMN6yC8JNwv2JGTQ')
    await promisify(doc.useServiceAccountAuth)(creds)

    const info = await promisify(doc.getInfo)()
    const sheet = info.worksheets[0]

    const row = {
        name: req.body.name,
        email: req.body.email,
        mobilenumber: req.body.mobilenumber,
        service: req.body.service,
        payment: req.body.payment,
        date: req.body.date
    }

    await promisify(sheet.addRow)(row)

    if(req.body.payment=="Pay later"){
        res.render("success.ejs");
    }
    else{
        res.redirect("/payment");
    }
});

router.get('/payment', (req, res)=>{
    let params ={}
    params['MID'] = PaytmConfig.mid,
    params['WEBSITE'] = 'DEFAULT',
    params['CHANNEL_ID'] = 'WEB',
    params['INDUSTRY_TYPE_ID'] = 'Retail',
    params['ORDER_ID'] = 'ORD' + today.getDate() + today.getHours() + today.getMinutes( )+ today.getSeconds(),
    params['CUST_ID'] = 'CUST' + today.getDate() + today.getHours() + today.getMinutes( )+ today.getSeconds(),
    params['TXN_AMOUNT'] = '1',
    params['CALLBACK_URL'] = 'http://localhost:'+port+'/success',
    params['EMAIL'] = 'test@gmail.com',
    params['MOBILE_NO'] = '8489797055'

    checksum_lib.genchecksum(params, PaytmConfig.key, function(err,checksum){
        let txn_url = 'https://securegw.paytm.in/order/process'
        let form_fields = ""
        for(x in params)
        {
            form_fields += "<input type='hidden' name='"+x+"' value='"+params[x]+"'/>"

        }

        form_fields += "<input type='hidden' name='CHECKSUMHASH' value='"+checksum+"'/>"

        var html = '<html><body><center><h1>Do not Refresh the page</h1></center><form method="post" action="'+txn_url+'" name="f1">'+form_fields+'</form><script type="text/javascript">document.f1.submit()</script></body></html>'
        res.writeHead(200,{
            'Content-Type' : 'text/html'
        }) 
        res.write(html)
        res.end()
    })    
})

router.post('/success', (req, res) => {
    res.render('success.ejs')
})


module.exports = router
