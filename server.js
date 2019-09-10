const fs = require('fs')

const express = require('express')
const app = express()
const Airtable = require('airtable')
const { check } = require('express-validator/check')
const { createJWT, verifyJWT } = require('./auth')
const cookieParser = require('cookie-parser')
const ta = require('time-ago')
const nodemailer = require('nodemailer')

Airtable.configure({
    apiKey: process.env.AIRTABLE_API_KEY
})

const base = require('airtable').base(process.env.AIRTABLE_BASE_NAME)
const table = base(process.env.AIRTABLE_TABLE_NAME)

app.set('view engine', 'pug')

app.use(express.json())
app.use(express.static('public'))
app.use(cookieParser()) 

const initializedFile = './.data/initialized'

app.get('/admin/reset', (req, res) => {
  try {
    if (fs.existsSync(initializedFile)) {
      verifyJWT(req.cookies.token).then(decodedToken => {
        fs.unlink(initializedFile, err => {
          if (err) {
            console.error('Error removing the file')
            res.status(500).end()
            return
          }
          res.send('Session ended')
        })
      }).catch(err => {
        res.status(400).json({message: "Invalid auth token provided."})
      })
      
    } else {
      res.status(500).json({message: "No session started."})
    }
  } catch(err) {
    console.error(err)
  }
})

let records = []
const getAirtableRecords = () => {
  return new Promise((resolve, reject) => {
    //return cached results if called multiple times
    if (records.length > 0) {
      resolve(records)
    }

    // called for every page of records
    const processPage = (partialRecords, fetchNextPage) => {
      records = [...records, ...partialRecords]
      fetchNextPage()
    }

    // called when all the records have been retrieved
    const processRecords = err => {
      if (err) {
        console.error(err)
        return
      }

      resolve(records)
    }

    table 
      .select({
        view: process.env.AIRTABLE_VIEW_NAME
      })
      .eachPage(processPage, processRecords)
  })
}

const getEmails = async () => {
  records = []
  const emails = await getAirtableRecords()
  return emails.map(record => {
    return {
      'email': record.get('Email'), 
      'name': record.get('Name'), 
      'date': ta.ago(record.get('Date'))
    }
  })
}

app.get('/admin', (req, res) => {
  if (fs.existsSync(initializedFile)) {
    verifyJWT(req.cookies.token).then(decodedToken => {
      getEmails().then(emails => {
        res.render(__dirname + '/views/admin.pug', { emails: emails })
        res.end()
      })
      //res.sendFile()  
    }).catch(err => {
      res.status(400).json({message: "Invalid auth token provided."})
    })
  } else {
    const token = createJWT({
      maxAge: 60 * 24 * 365 * 5 //1 year
    })
    
    fs.closeSync(fs.openSync('./.data/initialized', 'w'))
    
    res.cookie('token', token, { httpOnly: true, secure: true })

    getEmails().then(emails => {
      res.render(__dirname + '/views/admin.pug', { emails: emails })
      res.end()
    })
  }
})

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

app.post('/send', (req, res) => {
  const body = req.body.content
  
  const subject = 'Newsletter from me!'
  
  getEmails().then(emails => {
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
      }
    })  
    
    const sleep = (milliseconds) => {
      return new Promise(resolve => setTimeout(resolve, milliseconds))
    }
    
    const sendEmail = (mailOptions, i, emails, res) => {
      if (i === emails.length) {
        res.end()
        return
      }
      mailOptions.to = emails[i].email

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.log(err)
        } else {
          // email sent
          sleep(500).then(() => {
            sendEmail(mailOptions, ++i, emails, res)
          })

        }
      })
    }
    
    const mailOptions = {
      from: process.env.FROM_EMAIL,
      subject: subject,
      html: body
    }
    
    sendEmail(mailOptions, 0, emails, res)
  })
})

app.post('/form', [
  check('name').isAlpha().isLength({ min: 3, max: 100 }),
  check('email').isEmail()
], (req, res) => {
  const name = req.body.name
  const email = req.body.email
  const date = (new Date()).toISOString()
    
  table.create({
    "Name": name,
    "Email": email,
    "Date": date
  }, (err, record) => {
    if (err) {
      console.error(err)
      return
    }

    console.log(record.getId())
  })
  
  res.end()
})

const listener = app.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
