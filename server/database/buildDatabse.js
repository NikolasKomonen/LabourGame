const SQL = require('./sqliteIndex')
const db = new SQL('server/database/LabourGameDB.sqlite')

function createTables() {
    return new Promise((resolve, reject) => {
        console.log("CREATING TABLESZZZZZZZZZZZZZZZZZZZZZZZZZZZ")

        const accounts = `CREATE TABLE IF NOT EXISTS accounts (
                            id varchar(40) PRIMARY KEY,
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
                accounts_id varchar(40),
                companies_name text,
                weeks_week integer,
                hours integer,
                strike boolean,
                PRIMARY KEY (accounts_id, companies_name, weeks_week)
                )`

        const student_game_weeks = `CREATE TABLE IF NOT EXISTS student_game_weeks (
                accounts_id varchar(40),
                weeks_week integer,
                submitted binary,
                PRIMARY KEY (accounts_id, weeks_week)
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

function insertMockData() {
    
    return new Promise(async (resolve, reject) => {
        console.log("Inserting Data FAMOOOOOOOOOOOOOOOOOOOOOOOOO")
        for (let i = 0; i < 10; i++) {
            let sql = `INSERT INTO accounts VALUES (?, ?, ?, ?)`
            db.run(sql, ["User" + i, "password" + i, "salt" + i, true]).then()
        }

        for (let i = 0; i < 10; i++) {
            let sql = `INSERT INTO companies VALUES (?)`
            db.run(sql, ["Asscorp" + i]).then()
        }

        for (let i = 0; i < 10; i++) {
            let sql = `INSERT INTO weeks VALUES (?)`
            db.run(sql, [i])
        }


        for (let i = 0; i < 10; i++) {
            let sql = `INSERT INTO game_selections VALUES (?, ?, ?, ?, ?)`
            db.run(sql, ["User" + i, "Asscorp" + i, i, i, false])
        }

        for (let i = 0; i < 10; i++) {
            let sql = `INSERT INTO student_game_weeks VALUES (?, ?, ?)`
            db.run(sql, ["User" + i, i, false])
        }

        for (let i = 0; i < 10; i++) {
            let sql = `INSERT INTO game_sessions VALUES (?, ?, ?, ?, ?)`
            db.run(sql, ["Asscorp" + i, i, i, i * 5, i * 7])
        }
        resolve();
    })


}
db.createDB("server/database/dbFile.sqlite").then(() => {
    return createTables()
})
.then(() => {
        return insertMockData()
    })
.then(() => db.close())



