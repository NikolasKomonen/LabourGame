const SQL = require('./sqliteIndex')
const db = new SQL('server/database/dbFile.sqlite')
const fs = require('fs')
db.startDB()
const {Parser} = require('json2csv')

const gatherWeeklyData = (campaign_id, week) => {
    let data = []
    let campaign_name;
    db.get(`SELECT * FROM campaigns WHERE id=?`, [campaign_id])
    .then((row) => {
        console.log('Rowaz: ',row)
        campaign_name = row.name
        return db.all(`SELECT username FROM accounts WHERE campaigns_id=? AND admin=0`, [campaign_id])
    })
    .then((rows) => {
        let allSelections = rows.map((row) => {
            const username = row.username

            return db.all(
                `
                SELECT 
                    sess.companies_name, COALESCE(accounts_username, ?) accounts_username, COALESCE(hours, 0) hours, COALESCE(strike, FALSE) strike 
                FROM 
                    (SELECT * FROM company_sessions WHERE weeks_week=? AND campaigns_id=?) AS sess 
                LEFT JOIN 
                    (SELECT * FROM user_game_selections WHERE accounts_username=?) AS selc 
                ON 
                    sess.companies_name=selc.companies_name 
                    AND
                    sess.weeks_week=selc.weeks_week
                ORDER BY
                    sess.companies_name ASC
                `
                , [username, week, campaign_id, username]
            )
        })
        return allSelections
    }).then((all) => {
        Promise.all(all)
        .then((rows) => {
            rows.forEach(row => {
                data = data.concat(row)
            });
        })
        .then(() => {
            const json2csvParser = new Parser()
            const csv = json2csvParser.parse(data)
            const fileName = campaign_name + "-Week" + week + "-Results.csv"
            fs.appendFile(fileName, csv, (err) => {
                if(err) {
                    console.log(err)
                }
                else {
                    console.log("Success with: ", fileName)
                }
            })
        })
    })
        
}

gatherWeeklyData(1, 1)