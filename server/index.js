const companies = require('./routes/game');
const SQL = require('./database/sqliteIndex')

const express = require('express')
const app = express()
const port = 3001
const db = new SQL('server/database/dbFile.sqlite'); // May have to change relative to the index.js file else the workspace
const session = require('express-session')
const encryption = require('./encryption')
const sessionAccounts = {

}

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
	const selection = req.body // { week, update : {companies_name, hours, strike}}
	const username = sessionAccounts[id]
	const week = selection.week
	const update = selection.update
	const companyName = update.companies_name
	const hours = update.hours
	const strike = update.strike
	if(username && week && companyName && (hours >= 0) && strike !== undefined) {
		if(hours === 0) {
			db.run("DELETE FROM user_selections WHERE accounts_username=? AND companies_name=? AND weeks_week=?", [username, companyName, week]).then(() => {
				res.status(200).send()
			})
		}
		db.run("REPLACE INTO user_selections (accounts_username, companies_name, weeks_week, hours, strike) VALUES (?, ?, ?, ?, ?)", 
				[username, companyName, week, hours, strike]).then((success) => {
					console.log("Success: ", success)
					res.status(200)
					res.end()
				}).catch((err) => {console.log("Opsie woopies made a dipey wipey. The data is wong."); res.status(500).end()})
	}
	else {
		console.log("Not all information available in /api/sendSelection")
		res.status(500).end()
	}
})

app.post('/api/registerAccount', (req, res) => {
	const username = req.body.username;
	const password = req.body.password;
	if (username && password) {
		db.get("SELECT * FROM accounts WHERE username=?", [username]).then(
			(result) => {
				
				if(result) {
					res.status(422)
					res.send('Username already exists');
				}
				else {
					const newPassword = encryption.saltHashPassword(password)
					const salt = newPassword.salt
					const hashedPassword = newPassword.passwordHash
					db.run("INSERT INTO accounts VALUES (?, ?, ?, ?)", [username, hashedPassword, salt, "FALSE"]).then(() => {
						res.status(200)
						res.end();
					})
				}
				
				
			}
		)
	}
})

app.post('/api/login', function (req, res) {
	console.log("Received and auth request")
	const username = req.body.username;
	const password = req.body.password;
	console.log("Username: ", username, " Password: ", password)
	if (username && password) {
		db.get("SELECT * FROM accounts WHERE username=?", [username]).then(
			(row) => {
				if(!row) {
					res.status(422)
					res.send('Incorrect Username and/or Password!');
					return;
				}
				const dbPassword = row.password
				const salt = row.salt
				const shad = encryption.sha512(password, salt)
				if( shad.passwordHash === dbPassword) {
					const sessionId = req.sessionID
					sessionAccounts[sessionId] = username
					res.status(200)
					req.session.loggedIn = true;
					req.session.username = username;
					res.end();
					return;
				}
				res.status(422)
				res.send('Incorrect Username and/or Password!');
			}
		)
	}
})

app.post('/api/logout', (req, res) => {
	if(req.session.loggedIn) {
		res.status(200)
		res.end()
		const sessionId = req.sessionID
		delete sessionAccounts[sessionId]
		req.session.destroy();
	}
	
})

app.get('/api/isLoggedIn', (req, res) => {
	res.status(200)
	let isLoggedIn = false;
	if(req.session.loggedIn === true) {
		isLoggedIn = true
	}
	res.send({isLoggedIn: isLoggedIn})
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))