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

        const game_sessions = `CREATE TABLE IF NOT EXISTS game_sessions (
                companies_name text,
                weeks_week integer,
                brain integer,
                muscle integer,
                heart integer,
                PRIMARY KEY (companies_name, weeks_week)
                )`
        
        const companies = `CREATE TABLE IF NOT EXISTS companies (
                name text PRIMARY KEY
                )`

        const weeks = `CREATE TABLE IF NOT EXISTS weeks (
                week integer PRIMARY KEY
                )`

        const game_selections = `CREATE TABLE IF NOT EXISTS game_selections (
                accounts_username varchar(40),
                companies_name text,
                weeks_week integer,
                hours integer,
                strike boolean,
                PRIMARY KEY (accounts_username, companies_name, weeks_week)
                )`

        const student_game_weeks = `CREATE TABLE IF NOT EXISTS student_game_weeks (
                accounts_username varchar(40),
                weeks_week integer,
                submitted binary,
                PRIMARY KEY (accounts_username, weeks_week)
                )`

        Promise.all([db.run(accounts), 
                     db.run(game_sessions), 
                     db.run(companies), 
                     db.run(weeks), 
                     db.run(game_selections), 
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

function insertStudentGameWeeks(username, week, isSubmitted) {
    return db.run(`INSERT INTO student_game_weeks VALUES (?, ?, ?)`, [username, week, isSubmitted])
}

function insertGameSelections(username, company_name, weeks_week, hours, strike) {
    return db.run('INSERT INTO game_selections VALUES (?, ?, ?, ?, ?)', [username, company_name, weeks_week, hours, strike])
}

function insertGameSessions(company_name, weeks_week, brain, muscle, heart) {
    return db.run('INSERT INTO game_sessions VALUES(?, ?, ?, ?, ?)', [company_name, weeks_week, brain, muscle, heart])
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
            insertAccounts('a', 'a', 'salty-salt', false),
            insertAccounts('nikomo55', 'plopplop222', 'salty-salt', false),
            insertAccounts('johnson22', 'blasterPasswer', 'salty-salt', false),
            insertAccounts('kittykat666', 'firePassword', 'salty-salt', false),
            insertAccounts('IAmAdmin', 'passwordDragon', 'salty-salt', true),
            insertAccounts('willy52', 'password123', 'salty-salt', false),
            // Student Game Weeks
            insertStudentGameWeeks('nikomo55', 1, false),
            insertStudentGameWeeks('nikomo55', 2, false),
            insertStudentGameWeeks('nikomo55', 3, false),
            insertStudentGameWeeks('johnson22', 1, false),
            insertStudentGameWeeks('johnson22', 2, false),
            insertStudentGameWeeks('johnson22', 3, false),
            // Game Sessions
            insertGameSessions('Best Buy', 1, 2, 3, 5),
            insertGameSessions('Best Buy', 2, 4, 5, 2),
            insertGameSessions('No Frills', 1, 2, 3, 5),
            insertGameSessions('Michaels Meats', 1, 2, 3, 5),
            insertGameSessions('Michaels Meats', 2, 2, 3, 5),
            insertGameSessions('Chings Chinese', 1, 6, 9, 7),
            insertGameSessions('Chings Chinese', 2, 2, 3, 5),
            insertGameSessions('MEDITATION', 1, 6, 6, 6),
            insertGameSessions('GYM', 1, 9, 8, 7),
            insertGameSessions('TUTORIAL', 1, 2, 3, 4),
            //Game Selections
            insertGameSelections('nikomo55', 'Best Buy', 1, 3, false),
            insertGameSelections('nikomo55', 'No Frills', 1, 16, false),
            insertGameSelections('nikomo55', 'Michaels Meats', 1, 8, false),
            insertGameSelections('nikomo55', 'Chings Chinese', 1, 2, false),
            insertGameSelections('nikomo55', 'Best Buy', 2, 12, false),
            insertGameSelections('nikomo55', 'Michaels Meats', 2, 15, false),
            insertGameSelections('nikomo55', 'Chings Chinese', 2, 53, true)]
        ).then(() => resolve())
    })


}
createTables()
.then(() => {
        return insertMockData()
    })
.then(() => db.close())



