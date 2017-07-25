const express = require('express');
const app = express();
const request = require('request')
const moment = require('moment')
const momentTimezone = require('moment-timezone')
const firebase = require('firebase')
const csv = require('csvtojson')

var io = require('socket.io')();

app.socketIO = io


var config = {
    apiKey: "AIzaSyAv7OS2TOXSCx-T3slpOOv3r9KHJkbYzoU",
    authDomain: "stocks-b64f6.firebaseapp.com",
    databaseURL: "https://stocks-b64f6.firebaseio.com",
    projectId: "stocks-b64f6",
    storageBucket: "stocks-b64f6.appspot.com",
    messagingSenderId: "600962507366"
  };
firebase.initializeApp(config);

const db = firebase.database()

app.all('/', (req, res, next) => {
  res.send('stocksapp server v 0.0.1')
})

function getRealTimeStocks(f,symbol, interval, callback){
  
  request.get({
    url: `https://www.alphavantage.co/query?function=${f}&symbol=${symbol}&interval=${interval}&apikey=KCUL`
  }, (err, res, body) => {
  
    console.log(JSON.parse(body))

    var data = []
    const items = JSON.parse(body)[`Time Series (${interval})`]
    
    for(let key in items){
  
      let stock = {}

      var item = items[key]

      stock.close = item['4. close']
      stock.time = key

      data.push(stock)

    }

    callback(data)
  })
}

const f = {
  intraday: 'TIME_SERIES_INTRADAY'
}

function getStocks(symbol, interval, period, callback){
  request.get({
    url: `https://www.google.com/finance/getprices?q=${symbol}&x=NASD&i=${interval}&p=${period}&f=d,c&df=cpct&auto=0&ei=Ef6XUYDfCqSTiAKEMg`,
    headers:{
      "Authorization": auth
    }
  }, (err,res,body) => {
    
    var startTimestamp, m, points = [] 

    csv()
      .fromString(body)
      .on('csv',(row, index)=>{
      
        if(row[0][0] == 'a') {
          startTimestamp = Number(row[0].substring(1)) 
          m = moment.unix(startTimestamp)
          points.push(`${momentTimezone.tz(m,'America/New_York').toString()}/${row[1]}`)
          
        } else if (startTimestamp && !isNaN(row[0])){
          m = moment.unix(startTimestamp + row[0] * interval)
          points.push(`${momentTimezone.tz(m,'America/New_York').toString()}/${row[1]}`)
        }

      })
      .on('done',()=>{
        callback(points)
      })
  })
}

function searchCompany(text, callback){
  request.get({
    url: `http://www.nasdaq.com/aspx/symbolnamesearch.aspx?q=${text}`
  }, (err,res,body) => {

    var result = []

    csv()
      .fromString(body)
      .on('csv',(row, index)=>{

        const res = row[0].split(';')[0].split(' | ')

        result.push({
          symbol: res[0],
          des: res[1]
        })
      })
      .on('done',()=>{
        callback(result)
    })
  })
}

app.get('/searchCompany/:text', (req,res) => {

  searchCompany(req.params.text, data => {
    res.send(JSON.stringify(data))
  })
})

app.get('/stocksForToday/:symbol', (req, mainRes) => {
   getRealTimeStocks(f.intraday,req.params.symbol, '5min', data => {
     mainRes.json(data)
   })
})

app.get('/stocksForFiveDays/:symbol', (req, mainRes) => {
  getStocks(req.params.symbol, '1800', '5d', points => {
    mainRes.send(JSON.stringify(points))
  })
})

app.get('/stocksForMonth/:symbol', (req, mainRes) => {
  getStocks(req.params.symbol, '86400', '1M', points => {
    mainRes.send(JSON.stringify(points))
  })
})

app.get('/stocksForThreeMonths/:symbol', (req, mainRes) => {
  getStocks(req.params.symbol, '86400', '3M', points => {
    mainRes.send(JSON.stringify(points))
  })
})

app.get('/stocksForSixMonths/:symbol', (req, mainRes) => {
  getStocks(req.params.symbol, '300', '1', points => {
    mainRes.send(JSON.stringify(points))
  })
})

app.get('/stocksForYear/:symbol', (req, mainRes) => {
  getStocks(req.params.symbol, 86400 * 7, '1Y', points => {
    mainRes.send(JSON.stringify(points))
  })
})


module.exports = app