const companies = require('./routes/game');
const SQL = require('./database/sqliteIndex')

const path = require('path')
const express = require('express')
const app = express()
const port = 3001
const db = new SQL('./database/dbFile');
const session = require('express-session')


app.use(session({
	secret: 'my-ass-hole',
	resave: true,
	saveUninitialized: true
}));

app.use(express.json())

app.get('/api/getCompanies', (req, res) => {
    res.status(200)
    res.send(companies.getCompanies());
})

app.post('/api/sendSelection', (req, res) => {
	console.log(req.body)
	
	res.status(200)
	res.end()
})

app.post('/register', function (req, res) {

})

app.post('/auth', function(req, res) {
	const username = req.body.username;
	const password = req.body.password;
	if (username && password) {
		db.get('SELECT * FROM accounts WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {
			if (results.length > 0) {
				req.session.loggedin = true;
				req.session.username = username;
				res.redirect('/home');
			} else {
				res.send('Incorrect Username and/or Password!');
			}			
			res.end();
		});
	} else {
		res.send('Please enter Username and Password!');
		res.end();
	}
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'build', 'index.html'))
})



app.listen(port, () => console.log(`Example app listening on port ${port}!`))