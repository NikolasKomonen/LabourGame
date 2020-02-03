
const SQL = require('./database/sqliteIndex')
const path = require('path')
const express = require('express')
const app = express()
const port = 3001
let db = new SQL(path.join(__dirname, 'database/dbFile.sqlite'));
db.startDB()
const session = require('express-session')
const encryption = require('./encryption')
const admin = require('./administration')

app.use(session({
	secret: 'wee-woo-seeecret',
	resave: true,
	saveUninitialized: true
}));

app.use(express.json())

app.use(express.static(path.join(__dirname,'../build')))

app.get('/api/getGameFormData', (req, res) => {
	if(!req.session.loggedIn) {
		return;
	}
	const data = {}
	const username = req.session.username
	const week = req.body.week == null ? admin.currentWeek[req.session.campaign_id] : req.body.week
	data.username = username
	data.week = week
	Promise.all([
		db.get("SELECT * FROM user_game_weeks WHERE accounts_username=? AND weeks_week=?", [username, week]),
		db.all(
			`
			SELECT 
				comp.name AS name, comp.id AS id, brain AS brainMultiplier, muscle AS muscleMultiplier, heart AS heartMultiplier, COALESCE(hours, 0) hours, COALESCE(strike, 0) strike 
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
				(SELECT * FROM user_game_selections WHERE accounts_username=? AND weeks_week=?) AS selec 
			ON 
				comp.id=selec.companies_id
			ORDER BY
				comp.id ASC
			`
			, [week, username, week]),
		db.get(`SELECT * FROM user_profit_weeks WHERE accounts_username=? AND weeks_week=?`, [username, week])
	]).then((queries) => {
		// [ 
			//	{ 
			//    id: 1,
			//	  name: 'Best Buy',
			// 	  brainMultiplier: 4,
			//    muscleMultiplier: 5,
			//    heartMultiplier: 2,
			//    hours: 12,
			//    strike: 0,
			//  } , ... 
		// ]
		const company_sessions = queries[1]
		//re-order to have the Resources at the end in the order TUTORIAL, GYM, MEDITATION
		let ordered_companies = []
		let ordered_resources = []
		company_sessions.forEach(company => {
			const name = company.name
			
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

		// all_companies is an accumulation of all row data per company
		// that includes multipliers as well as the users data (if they haven't started yet then it is default values)
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
		if(firstRow) { // this week's game session data was already created
			data.submitted = firstRow.submitted > 0
			data.available_brain = firstRow.available_brain
			data.available_muscle = firstRow.available_muscle
			data.available_heart = firstRow.available_heart
			res.send(data)
		}
		else { // student row for this weeks game doesnt exist yet
			// The following creates the only necessary user specific data for a user to play,
			// (the data that holds available resources) everything else should have been generated beforehand
			// somewhere else
			data.submitted = false
			const lastWeek = week - 1
			if(week === 1) {
				// Initialize the user_game_week with the initial values
				db.run("INSERT INTO user_game_weeks VALUES (?, ?, ?, ?, ?, ?)", [username, week, false, startingPoints, startingPoints, startingPoints])
				data.total_profit = 0
				data.week_profit = 0
				data.available_brain = startingPoints
				data.available_muscle = startingPoints
				data.available_heart = startingPoints
				res.send(data)
			}
			else { // On week 2 and onward
				Promise.all(
					[
						db.all(`SELECT 
									companies.name, hours 
								FROM 
									companies
								JOIN
									user_game_selections
								ON
									companies.id=user_game_selections.companies_id
								WHERE 
									accounts_username=? 
									AND
									weeks_week=?
									AND
									companies.name IN ('MEDITATION', 'GYM', 'TUTORIAL') 
								ORDER BY 
									companies.name`
							, [username, lastWeek]),
				
						db.get("SELECT * FROM user_game_weeks WHERE accounts_username=? AND weeks_week=?", [username, lastWeek]),
						db.get(`SELECT * FROM user_profit_weeks WHERE accounts_username=? AND weeks_week=?`, [username, week])
					]
				)
				.then((queries) => {
					const resourceHours = queries[0]
					let [additional_brain, additional_muscle, additional_heart] = [0, 0, 0]
					resourceHours.forEach(row => {
						if(row.name === "MEDITATION") {
							additional_heart = row.hours
						}
						else if(row.name === "GYM") {
							additional_muscle = row.hours
						}
						else {
							additional_brain = row.hours
						}
					});
					// Figures out the Training done, and applies it to the new
					// available resources for this week
					const gameWeek = queries[1]
					if(gameWeek) {
						data.available_brain = gameWeek.available_brain+additional_brain
						data.available_muscle = gameWeek.available_muscle+additional_muscle
						data.available_heart = gameWeek.available_heart+additional_heart
					}
					else {
						console.log("Last week student game week doesnt exist with data(Username: ", username, ", LastWeek: ", lastWeek)
						res.status(500).send("Please contact administrator")
						return;
					}
					// Update total resources for this week, this is redundant protection since
					// the last weeks calculation should calculate this already
					db.run(`
						INSERT OR IGNORE INTO 
							user_game_weeks 
						VALUES 
							(?, ?, ?, ?, ?, ?) 
						`
						, [username, week, false, data.available_brain, data.available_muscle, data.available_heart])
					res.send(data)
				})
			}
		}
	})
})

app.post('/api/submitGameForm', (req, res) => {
	handleSelections(req, res, "submit")
}) 

app.post('/api/saveGameForm', (req, res) => {
	handleSelections(req, res, "save")
}) 

const handleSelections = (req, res, submissionType) => {
	const selection = req.body // { week, update : {COMPANY_ID: {hours, strike}, ...}, totalResources}
	const username = req.session.username
	const updates = selection.update
	const week = selection.week
	const resources = selection.totalResources
	db.run(`BEGIN TRANSACTION;`).then(() => {
		const queries = Object.keys(updates).map((id) => {
			const update = updates[id]
			const companyID = parseInt(id)
			let hours = update.hours
			if(isNaN(hours)) {
				hours = 0
			}
			let updatedStrike = update.strike
			if(updatedStrike == null) {
				updatedStrike = false
			}
			const strike = hours === 0 ? false : updatedStrike
			if(username && week && (hours >= 0)) {
				if(hours === 0) {
					return db.run("DELETE FROM user_game_selections WHERE accounts_username=? AND companies_id=? AND weeks_week=?;"
					,[username, companyID, week])
				}
				else {
					return db.run("REPLACE INTO user_game_selections (accounts_username, companies_id, weeks_week, hours, strike) VALUES (?, ?, ?, ?, ?);",
					[username, companyID, week, hours, strike])
				}	
			}
			return null;
		})
		if(week === 1) {
			queries.push(db.run('UPDATE user_game_weeks SET available_brain=?, available_muscle=?, available_heart=? WHERE accounts_username=? AND weeks_week=?', [resources.brain, resources.muscle, resources.heart, username, week]))
		}
		if(submissionType === "save") {
			queries.push(db.run(`UPDATE user_game_weeks SET submitted=1 WHERE accounts_username=? AND weeks_week=?`, [username, week]))
		}
		Promise.all(queries).then(() => {
			return db.run(`COMMIT;`)
		})
		.then(() => {
			res.status(200).send()
		})
	})
}

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
				if(shad.passwordHash === dbPassword) {
					req.session.loggedIn = true;
					req.session.username = username;
					req.session.campaign_id = row.campaigns_id
					res.status(200).end()
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
		req.session.destroy((err) => {
			if(!err) {
				res.status(200)
				res.end()
			}
		});
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