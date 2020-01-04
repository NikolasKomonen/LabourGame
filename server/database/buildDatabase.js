const SQL = require('./sqliteIndex')
const db = new SQL('server/database/dbFile.sqlite')

function createTables() {
    return new Promise((resolve, reject) => {
        console.log("CREATING TABLESZZZZZZZZZZZZZZZZZZZZZZZZZZZ")

        const accounts = `CREATE TABLE IF NOT EXISTS accounts (
                            username varchar(40) PRIMARY KEY,
                            password varchar(255),
                            salt varchar(16),
                            admin binary)`

        const company_sessions = `CREATE TABLE IF NOT EXISTS company_sessions (
                companies_name text,
                weeks_week integer,
                brain integer,
                muscle integer,
                heart integer,
                PRIMARY KEY (companies_name, weeks_week),
                FOREIGN KEY(companies_name) REFERENCES companies(name),
                FOREIGN KEY(weeks_week) REFERENCES weeks(week)
                )`
        
        const companies = `CREATE TABLE IF NOT EXISTS companies (
                name text PRIMARY KEY
                )`

        const weeks = `CREATE TABLE IF NOT EXISTS weeks (
                week integer PRIMARY KEY
                )`

        const user_selections = `CREATE TABLE IF NOT EXISTS user_selections (
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

        const student_game_weeks = `CREATE TABLE IF NOT EXISTS student_game_weeks (
                accounts_username varchar(40),
                weeks_week integer,
                submitted binary DEFAULT 0,
                available_brain integer DEFAULT 20,
                available_muscle integer DEFAULT 20,
                available_heart integer DEFAULT 20,
                week_profit integer DEFAULT 0,
                total_profit integer DEFAULT 0,
                PRIMARY KEY (accounts_username, weeks_week),
                FOREIGN KEY(accounts_username) REFERENCES accounts(username),
                FOREIGN KEY(weeks_week) REFERENCES weeks(week)
                )`

        Promise.all([db.run(accounts), 
                     db.run(company_sessions), 
                     db.run(companies), 
                     db.run(weeks), 
                     db.run(user_selections), 
                     db.run(student_game_weeks)])
                        .then(() => resolve()).catch((reject) => {console.log("Error when building table: " + reject)})
    })


}

function insertCompanies(companyName) {
    return db.run(`INSERT INTO companies VALUES (?)`, [companyName])
}

function insertWeeks(companyName) {
    return db.run(`INSERT INTO weeks VALUES (?)`, [companyName])
}

function insertAccounts(username, password, salt, isAdmin) {
    return db.run('INSERT INTO accounts VALUES (?, ?, ?, ?)', [username, password, salt, isAdmin])
}

function insertStudentGameWeeks(username, week, isSubmitted, available_brain, available_muscle, available_heart, total_profit, last_week_profit) {
    return db.run(`INSERT INTO student_game_weeks VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [username, week, isSubmitted, available_brain, available_muscle, available_heart, total_profit, last_week_profit])
}

function insertUserSelections(username, company_name, weeks_week, hours, strike) {
    return db.run('INSERT INTO user_selections VALUES (?, ?, ?, ?, ?)', [username, company_name, weeks_week, hours, strike])
}

function insertCompanySessions(company_name, weeks_week, brain, muscle, heart) {
    return db.run('INSERT INTO company_sessions VALUES(?, ?, ?, ?, ?)', [company_name, weeks_week, brain, muscle, heart])
}

function insertMockData() {
    
    return new Promise((resolve, reject) => {
        
        Promise.all([
            //Companies
            insertCompanies('Best Buy'),
            insertCompanies('No Frills'),
            insertCompanies('Michaels Meats'),
            insertCompanies('Chings Chinese'),
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
            // insertAccounts('nikomo55', 'poppop', 'salty-salt', false),
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
            insertCompanySessions('Best Buy', 1, 2, 3, 5),
            insertCompanySessions('Best Buy', 2, 4, 5, 2),
            insertCompanySessions('No Frills', 1, 2, 3, 5),
            insertCompanySessions('No Frills', 2, 75, 567, 76),
            insertCompanySessions('Michaels Meats', 1, 2, 3, 5),
            insertCompanySessions('Michaels Meats', 2, 2, 3, 5),
            insertCompanySessions('Chings Chinese', 1, 6, 9, 7),
            insertCompanySessions('Chings Chinese', 2, 2, 3, 5),
            insertCompanySessions('MEDITATION', 1, 6, 6, 6),
            insertCompanySessions('GYM', 1, 9, 8, 7),
            insertCompanySessions('TUTORIAL', 1, 2, 3, 4),
            insertCompanySessions('MEDITATION', 2, 222, 222, 222),
            insertCompanySessions('GYM', 2, 333, 333, 333),
            insertCompanySessions('TUTORIAL', 2, 444, 444, 444),
            //Game Selections
            insertUserSelections('nikomo55', 'Best Buy', 1, 3, false),
            insertUserSelections('nikomo55', 'No Frills', 1, 16, false),
            insertUserSelections('nikomo55', 'Michaels Meats', 1, 8, false),
            insertUserSelections('nikomo55', 'Chings Chinese', 1, 2, false),
            insertUserSelections('nikomo55', 'Best Buy', 2, 12, false),
            insertUserSelections('nikomo55', 'Michaels Meats', 2, 15, false),
            insertUserSelections('nikomo55', 'Chings Chinese', 2, 53, true),
        
            insertUserSelections('bill', 'Best Buy', 1, 33, false),
            insertUserSelections('bill', 'No Frills', 1, 166, false),
            insertUserSelections('bill', 'Michaels Meats', 1, 88, false),
            insertUserSelections('bill', 'Chings Chinese', 1, 22, false),
            insertUserSelections('bill', 'Best Buy', 2, 122, false),
            insertUserSelections('bill', 'Michaels Meats', 2, 155, false),
            insertUserSelections('bill', 'Chings Chinese', 2, 533, true)]
        ).then(() => resolve())
    })


}
createTables()
.then(() => {
        return insertMockData()
    })
.then(() => db.close())






