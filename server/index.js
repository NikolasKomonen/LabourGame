
const SQL = require('./database/sqliteIndex')

const express = require('express')
const app = express()
const port = 3001
const db = new SQL('server/database/dbFile.sqlite'); // May have to change relative to the index.js file else the workspace
const session = require('express-session')
const encryption = require('./encryption')
const sessionAccounts = {}
const admin = require('./administration')

app.use(session({
	secret: 'wee-woo-seeecret',
	resave: true,
	saveUninitialized: true
}));

app.use(express.json())

app.use(express.static('build'))

app.get('/api/getGameFormData', (req, res) => {
	const data = {}
	const id = req.sessionID
	const username = sessionAccounts[id]
	const week = admin.currentWeek
	data.username = username
	data.week = week
	Promise.all([
		db.get("SELECT * FROM user_game_weeks WHERE accounts_username=? AND weeks_week=?", [username, week]),
		db.all(
			`
			SELECT 
				sess.companies_name, brain, muscle, heart, COALESCE(accounts_username, ?) accounts_username, COALESCE(hours, 0) hours, COALESCE(strike, FALSE) strike 
			FROM 
				(SELECT * FROM company_sessions WHERE weeks_week=?) AS sess 
			LEFT JOIN 
				(SELECT * FROM user_selections WHERE accounts_username=?) AS selc 
			ON 
				sess.companies_name=selc.companies_name 
				AND
				sess.weeks_week=selc.weeks_week
			`
			, [username, admin.currentWeek, username]),
		db.get(`SELECT * FROM user_profit_weeks WHERE accounts_username=? AND weeks_week=?`, [username, week])
	]).then((queries) => {
		// [ 
			//	{ companies_name: 'Best Buy',
			// 	  brain: 4,
			//    muscle: 5,
			//    heart: 2,
			//    hours: 12,
			//    strike: 0 
			//  } , ... 
		// ]
		data.rows = queries[1]
		const firstRow = queries[0]
		const profitsRow = queries[2]
		if(firstRow) {
			data.submitted = firstRow.submitted
			data.available_brain = firstRow.available_brain
			data.available_muscle = firstRow.available_muscle
			data.available_heart = firstRow.available_heart
			if(profitsRow) {
				data.total_profit = profitsRow.total_profit
				data.week_profit = profitsRow.week_profit
			}
			res.send(data)
			console.log(data)
		}
		else { // student row for this weeks game doesnt exist yet
			data.submitted = false
			const lastWeek = week - 1
			if(lastWeek === 0) { // We are on week 1
				db.run("INSERT INTO user_game_weeks (accounts_username, weeks_week, submitted) VALUES (?, ?, ?)", [username, week, false])
				data.total_profit = 0
				data.week_profit = 0
				data.available_brain = 20
				data.available_muscle = 20
				data.available_heart = 20
				res.send(data)
				console.log(data)
			}
			else {
				Promise.all(
					[
						db.all(`SELECT 
									companies_name, hours 
								FROM 
									user_selections 
								WHERE 
									accounts_username=? 
									AND
									weeks_week=?
									AND
									companies_name IN ('MEDITATION', 'GYM', 'TUTORIAL') 
								ORDER BY 
									companies_name`
							, [username, lastWeek]),
				
						db.get("SELECT * FROM user_game_weeks WHERE accounts_username=? AND weeks_week=?", [username, lastWeek]),
						db.get(`SELECT * FROM user_profit_weeks WHERE accounts_username=? AND weeks_week=?`, [username, week])
					]
				)
				.then((queries) => {
					const nonJobHours = queries[0]
					let [additional_brain, additional_muscle, additional_heart] = [0, 0, 0]
					nonJobHours.forEach(row => {
						if(row.companies_name === "MEDITATION") {
							additional_heart = row.hours
						}
						else if(row.companies_name === "GYM") {
							additional_muscle = row.hours
						}
						else {
							additional_brain = row.hours
						}
					});

					const gameWeek = queries[1]
					if(gameWeek) {
						
						data.available_brain = gameWeek.available_brain+additional_brain
						data.available_muscle = gameWeek.available_muscle+additional_muscle
						data.available_heart = gameWeek.available_heart+additional_heart
					}
					else {
						console.log("Last week student game week doesnt exist")
						res.status(500).send("Please contact administrator")
					}
					
					db.run("INSERT INTO user_game_weeks VALUES (?, ?, ?, ?, ?, ?)", [username, week, false, data.available_brain, data.available_muscle, data.available_heart])
					res.send(data)
					console.log(data)
				})
			}
		}
	})
})

app.get('/api/submitGameForm', (req, res) => {
	const id = req.sessionID
	const username = sessionAccounts[id]
	db.run(`UPDATE user_game_weeks SET submitted=1 WHERE accounts_username=? AND weeks_week=?`, [username, admin.currentWeek]).then(() => {
		res.status(200).end()
	})
}) 

app.post('/api/sendSelection', (req, res) => {
	const id = req.sessionID
	const selection = req.body // { week, update : {companies_name, hours, strike}}
	const username = sessionAccounts[id]
	const week = admin.currentWeek
	const update = selection.update
	const companyName = update.companies_name
	let hours = update.hours
	if(isNaN(hours)) {
		hours = 0
	}
	const strike = hours === 0 ? false : update.strike
	if(username && week && companyName && (hours >= 0) && strike !== undefined) {
		if(hours === 0) {
			db.run("DELETE FROM user_selections WHERE accounts_username=? AND companies_name=? AND weeks_week=?", 
			[username, companyName, week]).then(() => {
				res.status(200).send()
			})
		}
		db.run("REPLACE INTO user_selections (accounts_username, companies_name, weeks_week, hours, strike) VALUES (?, ?, ?, ?, ?)", 
				[username, companyName, week, hours, strike]).then((success) => {
					console.log("Success: ", success)
					res.status(200)
					res.end()
				}).catch((err) => {console.log("Bad data from /api/sendSelection."); res.status(500).end()})
	}
	else {
		console.log("Not all information available in /api/sendSelection")
		res.status(500).end()
	}
})

app.post('/api/updateAvailablePoints', (req, res) => {
	const id = req.sessionID
	const username = sessionAccounts[id]
	const data = req.body
	const brain = data.available_brain
	const muscle = data.available_muscle
	const heart = data.available_heart
	db.run('UPDATE user_game_weeks SET available_brain=?, available_muscle=?, available_heart=? WHERE accounts_username=? AND weeks_week=?', [brain, muscle, heart, username, admin.currentWeek])
	.then(() => {
		res.status(200).end()
	}).catch((err) => {
		res.status(500).send(err)
	})
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