const SQL = require('./sqliteIndex')
const db = new SQL('server/database/dbFile.sqlite')

function createTables() {
    return new Promise((resolve, reject) => {
        console.log("CREATING TABLES")

        const campaigns = 
                `CREATE TABLE IF NOT EXISTS campaigns (
                    id INTEGER PRIMARY KEY,
                    name varchar(40)
                )`

        const accounts = 
                `CREATE TABLE IF NOT EXISTS accounts (
                    username varchar(40) PRIMARY KEY,
                    password varchar(255),
                    salt varchar(16),
                    admin binary DEFAULT 0,
                    campaigns_id varchar(40),
                    FOREIGN KEY (campaigns_id) REFERENCES campaigns(id)
                )`
        
        const companies = 
                `CREATE TABLE IF NOT EXISTS companies (
                    id integer PRIMARY KEY,
                    name text UNIQUE,
                    brain integer,
                    muscle integer,
                    heart integer
                )`

        const weekly_excluded_companies = 
                `CREATE TABLE IF NOT EXISTS weekly_excluded_companies (
                    weeks_week integer,
                    companies_id integer,
                    PRIMARY KEY (weeks_week, companies_id),
                    FOREIGN KEY (weeks_week) REFERENCES weeks(week),
                    FOREIGN KEY (companies_id) REFERENCES companies(id)
                )`

        const weeks = 
                `CREATE TABLE IF NOT EXISTS weeks (
                    week integer PRIMARY KEY
                )`

        const user_game_selections = 
                `CREATE TABLE IF NOT EXISTS user_game_selections (
                    accounts_username varchar(40),
                    companies_id integer,
                    weeks_week integer,
                    hours integer DEFAULT 0,
                    strike boolean DEFAULT FALSE,
                    PRIMARY KEY (accounts_username, companies_id, weeks_week),
                    FOREIGN KEY(accounts_username) REFERENCES accounts(username),
                    FOREIGN KEY(companies_id) REFERENCES companies(id),
                    FOREIGN KEY(weeks_week) REFERENCES weeks(week)
                )`

        const user_game_weeks = 
                `CREATE TABLE IF NOT EXISTS user_game_weeks (
                    accounts_username varchar(40),
                    weeks_week integer,
                    submitted binary DEFAULT 0,
                    available_brain integer,
                    available_muscle integer,
                    available_heart integer,
                    PRIMARY KEY (accounts_username, weeks_week),
                    FOREIGN KEY(accounts_username) REFERENCES accounts(username),
                    FOREIGN KEY(weeks_week) REFERENCES weeks(week)
                )`

        const user_profit_weeks = 
                `CREATE TABLE IF NOT EXISTS user_profit_weeks (
                    accounts_username varchar(40),
                    weeks_week integer,
                    week_profit integer DEFAULT 0,
                    total_profit integer DEFAULT 0,
                    PRIMARY KEY (accounts_username, weeks_week),
                    FOREIGN KEY(accounts_username) REFERENCES accounts(username),
                    FOREIGN KEY(weeks_week) REFERENCES weeks(week)
                )`

        const event_cards = 
                `CREATE TABLE IF NOT EXISTS event_cards (
                    id integer PRIMARY KEY,
                    description text,
                    event_types_id integer,
                    event_type_data BLOB
                )`

        const event_types = 
                `CREATE TABLE IF NOT EXISTS event_types (
                    id integer PRIMARY KEY,
                    description text
                )`

        const fixed_event_cards = 
                `CREATE TABLE IF NOT EXISTS fixed_event_cards (
                    event_cards_id integer,
                    weeks_week integer,
                    PRIMARY KEY (event_cards_id, weeks_week),
                    FOREIGN KEY (event_cards_id) REFERENCES event_cards(id)
                )`

        const career_history = 
                `CREATE TABLE IF NOT EXISTS career_history (
                    accounts_username text,
                    companies_id,
                    weeks_week,
                    is_supervisor binary,
                    PRIMARY KEY (accounts_username, companies_id, weeks_week),
                    FOREIGN KEY (accounts_username) REFERENCES accounts(username),
                    FOREIGN KEY (companies_id) REFERENCES companies(id),
                    FOREIGN KEY (weeks_week) REFERENCES weeks(week)
                )`
        

        Promise.all([
                        db.run(campaigns),
                        db.run(accounts), 
                        db.run(companies), 
                        db.run(weeks), 
                        db.run(user_game_selections), 
                        db.run(user_game_weeks),
                        db.run(user_profit_weeks),
                        db.run(weekly_excluded_companies)
                    ])
                    .then(() => resolve())
                    .catch((reject) => {
                        reject()
                        console.log("Error when building table: " + reject)
                    })
    })


}

function insertCompanies(companyName, brain, muscle, heart) {
    return db.run(`INSERT INTO companies (name, brain, muscle, heart) VALUES (?, ?, ?, ?)`, [companyName, brain, muscle, heart])
}

function insertWeeks(companyName) {
    return db.run(`INSERT INTO weeks VALUES (?)`, [companyName])
}

function insertAccounts(username, password, salt, isAdmin, campaigns_id) {
    return db.run('INSERT INTO accounts VALUES (?, ?, ?, ?, ?)', [username, password, salt, isAdmin, campaigns_id])
}

function insertStudentGameWeeks(username, week, isSubmitted, available_brain, available_muscle, available_heart, total_profit, last_week_profit) {
    return db.run(`INSERT INTO user_game_weeks VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [username, week, isSubmitted, available_brain, available_muscle, available_heart, total_profit, last_week_profit])
}

function insertUserSelections(username, company_name, weeks_week, hours, strike) {
    return db.run('INSERT INTO user_game_selections VALUES (?, ?, ?, ?, ?)', [username, company_name, weeks_week, hours, strike])
}

function insertCompanySessions(company_name, weeks_week, campaign_id, brain, muscle, heart) {
    return db.run('INSERT INTO company_sessions VALUES(?, ?, ?, ?, ?, ?)', [company_name, weeks_week, campaign_id, brain, muscle, heart])
}

function insertUserProfitWeeks(username, week, weekProfit, totalProfit) {
    return db.run('INSERT INTO user_profit_weeks VALUES(?, ?, ?, ?)', [username, week, weekProfit, totalProfit]) 
}

function insertCampaigns(campaign_name) {
    return db.run(`INSERT INTO campaigns (name) VALUES (?)`, [campaign_name])
}

function insertMockData() {
    
    return new Promise((resolve, reject) => {
        
        Promise.all([
            insertCampaigns('UTM'),
            insertCampaigns('SFU'),
            // Weeks
            insertWeeks(1),
            insertWeeks(2),
            insertWeeks(3),
            insertWeeks(4),
            insertWeeks(5),
            //Companies
            insertCompanies('Poopora', 1, 3, 2),
            insertCompanies('Cam with Benefits', 1, 2, 5),
            insertCompanies('Cheesewagon', 2, 0, 2),
            insertCompanies('Dim\'s Convenience', 1, 4, 1),
            insertCompanies('Flag that D', 1, 0, 1),
            insertCompanies('High Sugar', 0, 3, 1),
            insertCompanies('Robo A+', 3, 0, 1),
            insertCompanies('Skip the Pusher', 1, 3, 0),
            insertCompanies('SofaCrash', 1, 1, 2),
            insertCompanies('Code Monkey', 2, 0, 6),
            insertCompanies('MEDITATION', 0, 0, 2),
            insertCompanies('GYM', 0, 2, 0),
            insertCompanies('TUTORIAL', 2, 0, 0),
        ]
        ).then(() => resolve())
    })


}
db.startDB()
.then(() => {
    return createTables()
})
.then(() => {
    return insertMockData()
})
.then(() => db.close())







