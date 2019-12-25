const companies = require('./routes/game');
const SQL = require('./database/sqliteIndex')

const express = require('express')
const app = express()
const port = 3001
const db = new SQL('server/database/dbFile.sqlite'); // May have to change relative to the index.js file else the workspace
const session = require('express-session')


app.use(session({
	secret: 'my-ass-hole',
	resave: true,
	saveUninitialized: true
}));

app.use(express.json())

app.use(express.static('build'))

app.get('/api/getCompanies', (req, res) => {
    companies.getCompanies(req, res, db, 1)
})

app.post('/api/sendSelection', (req, res) => {
	const id = req.sessionID
	const selection = req.body // [[]...]
	
	res.status(200)
	res.end()
})

app.post('/register', function (req, res) {

})

app.post('/auth', function (req, res) {
	
	console.log("Received and auth request")
	const username = req.body.username;
	const password = req.body.password;
	console.log("Username: ", username, " Password: ", password)
	if (username && password) {
		db.get("SELECT * FROM accounts WHERE username=? AND password=?", [username, password]).then(
			() => {
				console.log("Successaz")
				res.status(200)
				req.session.loggedin = true;
				req.session.username = username;
				res.end();
			}
		).catch(() => {
			res.status(422)
			res.send('Incorrect Username and/or Password!');
		})
	}
})

app.get('/api/isLoggedIn', (req, res) => {
	res.status(200)
	if(req.session.loggedin === true) {
		res.send("Hi")
	}
	else {
		res.send("Bye")
	}
})

app.get('/', (req, res) => {
	console.log("Back at root")
	if(req.session.loggedin) {
		res.send("/game")
	}
	res.send('/')
})

// app.get('*', (req, res) => {
// 	if(res.session.loggedin) {
// 		res.send("/game")
// 	} else {
// 		res.send("/")
// 	}
// })



app.listen(port, () => console.log(`Example app listening on port ${port}!`))