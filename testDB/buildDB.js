const SQL = require('./sqliteIndex')
const db = new SQL('testDB/dbFile.sqlite')

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
                PRIMARY KEY (companies_name, weeks_week)
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
                PRIMARY KEY (accounts_username, companies_name, weeks_week)
                )`

        const user_game_weeks = `CREATE TABLE IF NOT EXISTS user_game_weeks (
                accounts_username varchar(40),
                weeks_week integer,
                submitted binary,
                PRIMARY KEY (accounts_username, weeks_week)
                )`

        Promise.all([db.run(accounts), 
                     db.run(company_sessions), 
                     db.run(companies), 
                     db.run(weeks), 
                     db.run(user_selections), 
                     db.run(user_game_weeks)])
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
    return db.run(`INSERT INTO user_game_weeks VALUES (?, ?, ?)`, [username, week, isSubmitted])
}

function insertGameSelections(username, company_name, weeks_week, hours, strike) {
    return db.run('INSERT INTO user_selections VALUES (?, ?, ?, ?, ?)', [username, company_name, weeks_week, hours, strike])
}

function insertGameSessions(company_name, weeks_week, brain, muscle, heart) {
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
            // insertAccounts('nikomo55', 'plopplop222', 'salty-salt', false),
            // insertAccounts('johnson22', 'blasterPasswer', 'salty-salt', false),
            // insertAccounts('kittykat666', 'firePassword', 'salty-salt', false),
            // insertAccounts('IAmAdmin', 'passwordDragon', 'salty-salt', true),
            // insertAccounts('willy52', 'password123', 'salty-salt', false),
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
            insertGameSessions('No Frills', 2, 75, 567, 76),
            insertGameSessions('Michaels Meats', 1, 2, 3, 5),
            insertGameSessions('Michaels Meats', 2, 2, 3, 5),
            insertGameSessions('Chings Chinese', 1, 6, 9, 7),
            insertGameSessions('Chings Chinese', 2, 2, 3, 5),
            insertGameSessions('MEDITATION', 1, 6, 6, 6),
            insertGameSessions('GYM', 1, 9, 8, 7),
            insertGameSessions('TUTORIAL', 1, 2, 3, 4),
            insertGameSessions('MEDITATION', 2, 222, 222, 222),
            insertGameSessions('GYM', 2, 333, 333, 333),
            insertGameSessions('TUTORIAL', 2, 444, 444, 444),
            //Game Selections
            insertGameSelections('nikomo55', 'Best Buy', 1, 3, false),
            insertGameSelections('nikomo55', 'No Frills', 1, 16, false),
            insertGameSelections('nikomo55', 'Michaels Meats', 1, 8, false),
            insertGameSelections('nikomo55', 'Chings Chinese', 1, 2, false),
            insertGameSelections('nikomo55', 'Best Buy', 2, 12, false),
            insertGameSelections('nikomo55', 'Michaels Meats', 2, 15, false),
            insertGameSelections('nikomo55', 'Chings Chinese', 2, 53, true),
        
            insertGameSelections('bill', 'Best Buy', 1, 33, false),
            insertGameSelections('bill', 'No Frills', 1, 166, false),
            insertGameSelections('bill', 'Michaels Meats', 1, 88, false),
            insertGameSelections('bill', 'Chings Chinese', 1, 22, false),
            insertGameSelections('bill', 'Best Buy', 2, 122, false),
            insertGameSelections('bill', 'Michaels Meats', 2, 155, false),
            insertGameSelections('bill', 'Chings Chinese', 2, 533, true)]
        ).then(() => resolve())
    })


}
// createTables()
// .then(() => {
//         return insertMockData()
//     })
// .then(() => db.close())

db.all(
    `
    SELECT 
        sess.companies_name, sess.weeks_week, brain, muscle, heart, COALESCE(accounts_username, ?) accounts_username, COALESCE(hours, 0) hours, COALESCE(strike, FALSE) strike 
    FROM 
        (SELECT * FROM company_sessions WHERE weeks_week=?) AS sess 
    LEFT JOIN 
        (SELECT * FROM user_selections WHERE accounts_username=?) AS acc 
    ON 
        sess.companies_name=acc.companies_name 
        AND
        sess.weeks_week=acc.weeks_week
    `
    
    , ["dog", 1, "dog"])
            .then((rows) => {console.log(rows)})




