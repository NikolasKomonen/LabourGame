
const SQL = require('./database/sqliteIndex')
const path = require('path')
const express = require('express')
const app = express()
const port = 3001
let db = new SQL('server/database/dbFile.sqlite'); // server/database/dbFile.sqlite OR database/dbFile.sqlite
db.startDB()
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
	const username = sessionAccounts[id].username
	const week = admin.currentWeek[sessionAccounts[req.sessionID].campaign_id]
	data.username = username
	data.week = week
	Promise.all([
		db.get("SELECT * FROM user_game_weeks WHERE accounts_username=? AND weeks_week=?", [username, week]),
		db.all(
			`
			SELECT 
				comp.name AS companies_name, brain, muscle, heart, COALESCE(hours, 0) hours, COALESCE(strike, 0) strike 
			FROM 
				(
					SELECT 
						* 
					FROM 
						companies AS c
					WHERE
						NOT EXISTS (SELECT companies_id 
									FROM weekly_excluded_companies 
									WHERE c.id=weekly_excluded_companies.companies_id AND weeks_week=?
									)	
				)
				AS comp 
			LEFT JOIN 
				(SELECT * FROM user_game_selections WHERE accounts_username=?) AS selec 
			ON 
				comp.id=selec.companies_id
			ORDER BY
				comp.id ASC
			`
			, [week, username]),
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
		const company_sessions = queries[1]
		//re-order to have the Resources at the end in the order TUTORIAL, GYM, MEDITATION
		let ordered_companies = []
		let ordered_resources = []
		company_sessions.forEach(company => {
			const name = company.companies_name
			
			if(name === "TUTORIAL") {
				ordered_resources[0] = company
			}
			else if(name === "GYM") {
				ordered_resources[1] = company
			}
			else if(name === "MEDITATION") {
				ordered_resources[2] = company
			}
			else {
				ordered_companies.push(company)
			}
			
		});
		const all_companies = ordered_companies.concat(ordered_resources)
		data.rows = all_companies
		const profitsRow = queries[2]
		if(profitsRow) {
			data.total_profit = profitsRow.total_profit
			data.week_profit = profitsRow.week_profit
		}
		else {
			data.total_profit = 0
			data.week_profit = 0
		}
		const firstRow = queries[0]
		const startingPoints = 30
		data.distributablePoints = startingPoints
		if(firstRow) {
			data.submitted = firstRow.submitted > 0
			data.available_brain = firstRow.available_brain
			data.available_muscle = firstRow.available_muscle
			data.available_heart = firstRow.available_heart
			
			res.send(data)
		}
		else { // student row for this weeks game doesnt exist yet
			data.submitted = false
			const lastWeek = week - 1
			if(lastWeek === 0) { // We are on week 1
				
				db.run("INSERT INTO user_game_weeks VALUES (?, ?, ?, ?, ?, ?)", [username, week, false, startingPoints, startingPoints, startingPoints])
				data.total_profit = 0
				data.week_profit = 0
				data.available_brain = startingPoints
				data.available_muscle = startingPoints
				data.available_heart = startingPoints
				
				res.send(data)
			}
			else {
				Promise.all(
					[
						db.all(`SELECT 
									companies_name, hours 
								FROM 
									companies
								JOIN
									user_game_selections
								ON
									companies_id=user_game_selections.companies_id
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
					const resourceHours = queries[0]
					let [additional_brain, additional_muscle, additional_heart] = [0, 0, 0]
					resourceHours.forEach(row => {
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
				})
			}
		}
	})
})

app.get('/api/submitGameForm', (req, res) => {
	const id = req.sessionID
	const username = sessionAccounts[id].username
	const week = admin.currentWeek[sessionAccounts[req.sessionID].campaign_id]
	db.run(`UPDATE user_game_weeks SET submitted=1 WHERE accounts_username=? AND weeks_week=?`, [username, week]).then(() => {
		res.status(200).end()
	})
}) 

app.post('/api/sendSelection', (req, res) => {
	const id = req.sessionID
	const selection = req.body // { week, update : {companies_name, hours, strike}}
	const username = sessionAccounts[id].username
	const week = admin.currentWeek[sessionAccounts[req.sessionID].campaign_id]
	const update = selection.update
	const companyName = update.companies_name
	let hours = update.hours
	if(isNaN(hours)) {
		hours = 0
	}
	const strike = hours === 0 ? false : update.strike
	if(username && week && companyName && (hours >= 0) && strike !== undefined) {
		if(hours === 0) {
			db.run("DELETE FROM user_game_selections WHERE accounts_username=? AND companies_id=(SELECT id FROM companies WHERE name=?) AND weeks_week=?", 
			[username, companyName, week]).then(() => {
				res.status(200).send()
			})
		}
		else {
			db.run("REPLACE INTO user_game_selections (accounts_username, companies_id, weeks_week, hours, strike) VALUES (?, (SELECT id FROM companies WHERE name=?), ?, ?, ?)", 
				[username, companyName, week, hours, strike]).then((success) => {
					res.status(200)
					res.end()
				}).catch((err) => {console.log("Bad data from /api/sendSelection."); res.status(500).end()})
		}
		
	}
	else {
		console.log("Not all information available in /api/sendSelection")
		res.status(500).end()
	}
})

app.post('/api/updateAvailablePoints', (req, res) => {
	const id = req.sessionID
	const username = sessionAccounts[id].username
	const data = req.body
	const brain = data.available_brain
	const muscle = data.available_muscle
	const heart = data.available_heart
	db.run('UPDATE user_game_weeks SET available_brain=?, available_muscle=?, available_heart=? WHERE accounts_username=? AND weeks_week=?', [brain, muscle, heart, username, admin.currentWeek[sessionAccounts[req.sessionID].campaign_id]])
	.then(() => {
		res.status(200).end()
	}).catch((err) => {
		res.status(500).send(err)
	})
})

app.get('/api/getAccountRegistrationData', (req, res) => {
	const data = {}
	db.all(`SELECT * FROM campaigns`).then((row) => {
		data.campaign_ids = row
	}).then(() => {
		res.status(200).send(data)
	})
})

app.post('/api/registerAccount', (req, res) => {
	const username = req.body.username;
	const password = req.body.password;
	const campaign_id = req.body.campaign_id
	if (username && password && campaign_id) {
		db.get("SELECT username FROM accounts WHERE username=?", [username]).then(
			(result) => {
				
				if(result) {
					res.status(422)
					res.send('Username already exists');
				}
				else {
					const newPassword = encryption.saltHashPassword(password)
					const salt = newPassword.salt
					const hashedPassword = newPassword.passwordHash
					db.run("INSERT INTO accounts VALUES (?, ?, ?, ?, ?)", [username, hashedPassword, salt, false, campaign_id]).then(() => {
						res.status(200)
						res.end();
					})
				}
				
				
			}
		)
	}
})

app.post('/api/login', function (req, res) {
	const username = req.body.username;
	const password = req.body.password;
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
					sessionAccounts[sessionId] = {}
					sessionAccounts[sessionId].username = username
					sessionAccounts[sessionId].campaign_id = row.campaigns_id
					sessionAccounts[sessionId].week = admin.currentWeek[row.campaigns_id]
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

app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname, '../build/index.html'))
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))