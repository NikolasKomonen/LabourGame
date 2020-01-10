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

        const company_sessions = 
                `CREATE TABLE IF NOT EXISTS company_sessions (
                    companies_name text,
                    weeks_week integer,
                    campaigns_id varchar(40),
                    brain integer,
                    muscle integer,
                    heart integer,
                    PRIMARY KEY (companies_name, weeks_week, campaigns_id),
                    FOREIGN KEY(companies_name) REFERENCES companies(name),
                    FOREIGN KEY(weeks_week) REFERENCES weeks(week),
                    FOREIGN KEY (campaigns_id) REFERENCES campaigns(id) 
                )`
        
        const companies = 
                `CREATE TABLE IF NOT EXISTS companies (
                    name text PRIMARY KEY
                )`

        const weeks = 
                `CREATE TABLE IF NOT EXISTS weeks (
                    week integer PRIMARY KEY
                )`

        const user_selections = 
                `CREATE TABLE IF NOT EXISTS user_selections (
                    accounts_username varchar(40),
                    companies_name text,
                    weeks_week integer,
                    hours integer DEFAULT 0,
                    strike boolean DEFAULT FALSE,
                    PRIMARY KEY (accounts_username, companies_name, weeks_week),
                    FOREIGN KEY(accounts_username) REFERENCES accounts(username),
                    FOREIGN KEY(companies_name) REFERENCES companies(name),
                    FOREIGN KEY(weeks_week) REFERENCES weeks(week)
                )`

        const user_game_weeks = 
                `CREATE TABLE IF NOT EXISTS user_game_weeks (
                    accounts_username varchar(40),
                    weeks_week integer,
                    submitted binary DEFAULT 0,
                    available_brain integer DEFAULT 20,
                    available_muscle integer DEFAULT 20,
                    available_heart integer DEFAULT 20,
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

        Promise.all([
                        db.run(campaigns),
                        db.run(accounts), 
                        db.run(company_sessions), 
                        db.run(companies), 
                        db.run(weeks), 
                        db.run(user_selections), 
                        db.run(user_game_weeks),
                        db.run(user_profit_weeks)
                    ])
                    .then(() => resolve())
                    .catch((reject) => {
                        console.log("Error when building table: " + reject)
                    })
    })


}

function insertCompanies(companyName) {
    return db.run(`INSERT INTO companies VALUES (?)`, [companyName])
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
    return db.run('INSERT INTO user_selections VALUES (?, ?, ?, ?, ?)', [username, company_name, weeks_week, hours, strike])
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
            insertCampaigns('Frasier'),
            //Companies
            insertCompanies('Best Buy'),
            insertCompanies('No Frills'),
            insertCompanies('BlockBuster'),
            insertCompanies('Loblaws'),
            insertCompanies('MEDITATION'),
            insertCompanies('GYM'),
            insertCompanies('TUTORIAL'),
            // Weeks
            insertWeeks(1),
            insertWeeks(2),
            insertWeeks(3),
            insertWeeks(4),
            insertWeeks(5),
            // Accounts
            // insertAccounts('a', 'a', 'salty-salt', false),
            //insertAccounts('nikomo55', '8ba9a12f5214f97d3200aab35d8c577429a344d35d5403a7e2d81e666e83820eb7dc124e626d401bf09643c39e93866bdd2a08cddbfb341bf7e05770f203e4a1', '435c850e583626e5', false),
            // insertAccounts('johnson22', 'blasterPasswer', 'salty-salt', false),
            // insertAccounts('kittykat666', 'firePassword', 'salty-salt', false),
            // insertAccounts('IAmAdmin', 'passwordDragon', 'salty-salt', true),
            // insertAccounts('willy52', 'password123', 'salty-salt', false),
            // Student Game Weeks
            // insertStudentGameWeeks('nikomo55', 1, false, 20, 20, 20, 0, 0),
            // insertStudentGameWeeks('nikomo55', 2, false, 20, 20, 20, 0, 0),
            // insertStudentGameWeeks('nikomo55', 3, false, 20, 20, 20, 0, 0),
            // insertStudentGameWeeks('johnson22', 1, false, 20, 20, 20, 0, 0),
            // insertStudentGameWeeks('johnson22', 2, false, 20, 20, 20, 0, 0),
            // insertStudentGameWeeks('johnson22', 3, false, 20, 20, 20, 0, 0),
            // Game Sessions
            insertCompanySessions('Best Buy', 1, "1", 1, 2, 3),
            insertCompanySessions('Best Buy', 2, "1", 2, 2, 2),
            insertCompanySessions('Best Buy', 3, "1", 3, 3, 3),
            insertCompanySessions('No Frills', 1, "1", 1, 2, 3),
            insertCompanySessions('No Frills', 2, "1", 2, 2, 2),
            insertCompanySessions('No Frills', 3, "1", 3, 3, 3),
            insertCompanySessions('BlockBuster', 1, "1", 1, 2, 3),
            insertCompanySessions('BlockBuster', 2, "1", 2, 2, 2),
            insertCompanySessions('BlockBuster', 3, "1", 3, 3, 3),
            insertCompanySessions('Loblaws', 1, "1", 1, 2, 3),
            insertCompanySessions('Loblaws', 2, "1", 2, 2, 2),
            insertCompanySessions('Loblaws', 3, "1", 3, 3, 3),
            insertCompanySessions('TUTORIAL', 1, "1", 1, 2, 3),
            insertCompanySessions('TUTORIAL', 2, "1", 2, 2, 2),
            insertCompanySessions('TUTORIAL', 3, "1", 3, 3, 3),
            insertCompanySessions('GYM', 1, "1", 1, 2, 3),
            insertCompanySessions('GYM', 2, "1", 2, 2, 2),
            insertCompanySessions('GYM', 3, "1", 3, 3, 3),
            insertCompanySessions('MEDITATION', 1, "1", 1, 2, 3),
            insertCompanySessions('MEDITATION', 2, "1", 2, 2, 2),
            insertCompanySessions('MEDITATION', 3, "1", 3, 3, 3),

            insertCompanySessions('Best Buy', 1, "2", 2, 2, 3),
            insertCompanySessions('Best Buy', 2, "2", 2, 2, 2),
            insertCompanySessions('Best Buy', 3, "2", 3, 3, 3),
            insertCompanySessions('No Frills', 1, "2", 2, 2, 3),
            insertCompanySessions('No Frills', 2, "2", 2, 2, 2),
            insertCompanySessions('No Frills', 3, "2", 3, 3, 3),
            insertCompanySessions('BlockBuster', 1, "2", 2, 2, 3),
            insertCompanySessions('BlockBuster', 2, "2", 2, 2, 2),
            insertCompanySessions('BlockBuster', 3, "2", 3, 3, 3),
            insertCompanySessions('Loblaws', 1, "2", 2, 2, 3),
            insertCompanySessions('Loblaws', 2, "2", 2, 2, 2),
            insertCompanySessions('Loblaws', 3, "2", 3, 3, 3),
            insertCompanySessions('TUTORIAL', 1, "2", 2, 2, 3),
            insertCompanySessions('TUTORIAL', 2, "2", 2, 2, 2),
            insertCompanySessions('TUTORIAL', 3, "2", 3, 3, 3),
            insertCompanySessions('GYM', 1, "2", 2, 2, 3),
            insertCompanySessions('GYM', 2, "2", 2, 2, 2),
            insertCompanySessions('GYM', 3, "2", 3, 3, 3),
            insertCompanySessions('MEDITATION', 1, "2", 2, 2, 3),
            insertCompanySessions('MEDITATION', 2, "2", 2, 2, 2),
            insertCompanySessions('MEDITATION', 3, "2", 3, 3, 3),
            
            // insertUserProfitWeeks('nikomo55', 1, 22, 55),
            // insertUserProfitWeeks('nikomo55', 1, 66, 77),
            // insertUserProfitWeeks('nikomo55', 1, 99, 1000)
            //Game Selections
            // insertUserSelections('nikomo55', 'Best Buy', 1, 3, false),
            // insertUserSelections('nikomo55', 'No Frills', 1, 16, false),
            // insertUserSelections('nikomo55', 'Michaels Meats', 1, 8, false),
            // insertUserSelections('nikomo55', 'Chings Chinese', 1, 2, false),
            // insertUserSelections('nikomo55', 'Best Buy', 2, 12, false),
            // insertUserSelections('nikomo55', 'Michaels Meats', 2, 15, false),
            // insertUserSelections('nikomo55', 'Chings Chinese', 2, 53, true),
        
            // insertUserSelections('bill', 'Best Buy', 1, 33, false),
            // insertUserSelections('bill', 'No Frills', 1, 166, false),
            // insertUserSelections('bill', 'Michaels Meats', 1, 88, false),
            // insertUserSelections('bill', 'Chings Chinese', 1, 22, false),
            // insertUserSelections('bill', 'Best Buy', 2, 122, false),
            // insertUserSelections('bill', 'Michaels Meats', 2, 155, false),
            // insertUserSelections('bill', 'Chings Chinese', 2, 533, true)
        ]
        ).then(() => resolve())
    })


}
createTables()
.then(() => {
        return insertMockData()
    })
.then(() => db.close())






