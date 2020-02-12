const sqlite3 = require('sqlite3').verbose();
const fs = require('fs')
const path = require('path')
class SQL {
    constructor(dbFilePath) {
        this.dbFilePath = dbFilePath
    }
    
    startDB() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbFilePath, (err) => {
                console.log("Trying to connect to db: " + this.dbFilePath)
                if (err) {
                    console.log('Could not connect to database', err)
                    reject()
                } else {
                    console.log('Connected to database')
                    resolve()
                }
            })
            
        })
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
                if (err) {
                    console.log('Error running sql ' + sql)
                    console.log(err)
                    reject(err)
                } else {
                    resolve({ id: this.lastID })
                }
            })
        })
    }

    exec(sql) {
        return new Promise((resolve, reject) => {
            this.db.exec(sql, function (err) {
                if (err) {
                    console.log('Error running sql ' + sql)
                    console.log(err)
                    reject(err)
                } else {
                    resolve({ id: this.lastID })
                }
            })
        })
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, result) => {
                if (err) {
                    console.log('Error running sql: ' + sql)
                    console.log(err)
                    reject(err)
                } else {
                    resolve(result)
                }
            })
        })
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.log('Error running sql: ' + sql)
                    console.log(err)
                    reject(err)
                } else {
                    resolve(rows)
                }
            })
        })
    }

    prepare(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.prepare(sql, params, (err, rows) => {
                if (err) {
                    console.log('Error running sql: ' + sql)
                    console.log(err)
                    reject(err)
                } else {
                    resolve(new Promise((resolve, reject) => {resolve(rows)}))
                }
            })
        })
    }

    close() {
        this.db.close()
        console.log("Closed database")
    }
}

module.exports = SQL
