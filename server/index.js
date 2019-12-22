const companies = require('./routes/game');

const path = require('path')
const express = require('express')
const app = express()
const port = 3001



// Set the build folder to be served to client on load
//app.use(express.static(path.join(__dirname, '..','build')))

app.get('/api/getCompanies', (req, res) => {
    res.status(200)
    res.send(companies.getCompanies());
})

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'build', 'index.html'))
})



app.listen(port, () => console.log(`Example app listening on port ${port}!`))