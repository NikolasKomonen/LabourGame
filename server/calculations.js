const SQL = require('./database/sqliteIndex')
const path = require('path')

let db = new SQL(path.join(__dirname, 'database/dbFileBeforeClass.sqlite'));
db.startDB()


const euler=2.7182818284590452353602874713527

class Modifications {
    constructor(db) {
        this.db = db
    }

    setInitialUserProfitWeeks() {
        db.all("SELECT username FROM accounts;").then((usernames) => {
            const t = usernames
            db.run("BEGIN TRANSACTION;").then(() => {
                const changes = usernames.map((account) => {
                    const username = account.username
                    return db.run("REPLACE INTO user_profit_weeks VALUES (?, ?, ?, ?)", [username, 1, 0, 0])
                })
                return Promise.all(changes)
            }).then(() => {
                db.run("COMMIT;")
            })
        })
        
    }
}

class Calculations {

    // Previous Week Rate * Euler^(Difference/Baseline)

    constructor(db) {
        this.db = db
        this.table = {}
        this.thisWeeksCompanies = null;
        this.baseline = 0;
    }

    calculateBaseline(week, campaigns_id) {
       return Promise.all([
           this.calculateTotalHours(week, campaigns_id),
           this.getThisWeeksCompaniesCount(week)
       ]).then((data) => {
           const totalHours = data[0]["sum(hours)"]
           const companiesCount = data[1]["COUNT(*)"]
           this.baseline = totalHours/companiesCount // TODO: this is wrong
       })
    }

    calculateTotalHours(week, campaigns_id) {
        return this.db.get(
            `
            SELECT 
                sum(hours) 
            FROM 
                (
                    (   SELECT 
                            username 
                        FROM 
                            accounts 
                        WHERE 
                            campaigns_id=?
                    )AS users

                    JOIN 
                        (SELECT * FROM user_game_selections WHERE weeks_week=?) AS selections
                    ON 
                        users.username=selections.accounts_username 
                );
            
                `, [campaigns_id, week])
    }

    getThisWeeksCompanies(week) {
        return this.db.all(`SELECT id, name FROM companies WHERE id NOT IN (SELECT companies_id FROM weekly_excluded_companies WHERE weeks_week=?) AND companies.starting_wage IS NOT null;`, [week])
    }

    getThisWeeksCompaniesCount(week) {
        return this.db.get(`SELECT COUNT(*) FROM companies WHERE id NOT IN (SELECT companies_id FROM weekly_excluded_companies WHERE weeks_week=?) AND companies.starting_wage IS NOT null;`, [week])
    }

    getTotalCompanyHours(week, companies_id, campaigns_id) {
        return this.db.get('SELECT sum(hours) FROM user_game_selections JOIN (SELECT * FROM accounts WHERE campaigns_id=?) ON username=accounts_username WHERE companies_id=? AND weeks_week=?;', [campaigns_id, companies_id, week])
    }

    getWeekWage(week, companies_id, campaigns_id) {
        return this.db.get(`SELECT * FROM company_wage_history WHERE weeks_week=? AND companies_id=? and campaigns_id=?;`, [week, companies_id, campaigns_id])
    }

    getDifference(week, companies_id, campaigns_id) {
        Promise.all([this.getThisWeeksCompaniesCount(week), this.getTotalCompanyHours(week, companies_id, campaigns_id)]).then((data) => {
            const count = data[0]
            const totalHours = data[1]
            return (totalHours/count)
        })
    }

    calculateHourlyRate(hourlyRate, difference) {
        return (hourlyRate*Math.pow(euler, (difference/this.baseline)))
    }

    calculateWageForCompany(week, companies_id, campaigns_id) {
        return new Promise((resolve, reject) => {
            let calculations = [
                this.getWeekWage(week, companies_id, campaigns_id),
                this.getTotalCompanyHours(week, companies_id, campaigns_id)
            ]
            
            if(this.baseline === 0) {
                calculations.push(this.calculateBaseline(week, campaigns_id))
            }


            Promise.all(calculations).then((data) => {
                const hourlyRate = data[0].wage
                const baseline = this.baseline
                const difference = baseline - (data[1]["sum(hours)"])
                let nextWeekHourlyRate = this.calculateHourlyRate(hourlyRate, difference)
                if(nextWeekHourlyRate > hourlyRate) {
                    const maxLimit = hourlyRate * 1.2
                    if(nextWeekHourlyRate > maxLimit) {
                        nextWeekHourlyRate = maxLimit
                    }
                }
                else {
                    const minLimit = hourlyRate * 0.8
                    if(nextWeekHourlyRate < minLimit) {
                        nextWeekHourlyRate = minLimit
                    }
                }
                resolve({companies_id: companies_id, hourlyRate: nextWeekHourlyRate})
            })
        })
    }

    getWagesForThisWeek(week, campaigns_id) {
        const lastWeek = week - 1
        return this.getThisWeeksCompanies(lastWeek).then((companies) => {
            return Promise.all(companies.map((row) => {
                return this.calculateWageForCompany(lastWeek, row.id, campaigns_id)
            }))
        })
    }

    calculateUserScores(week, campaigns_id, fixedEvents, weeklyEvents, strikeEvents, careerBoosts) {
        const lastWeek = week - 1
        return db.all(
            `SELECT username, wage, hours, (hours * ?) AS income, totalHours, career FROM 
            (
                SELECT 
                    username, companies_id, name, hours 
                FROM 
                    accounts
                JOIN 
                    (SELECT * FROM user_game_selections JOIN companies ON user_game_selections.companies_id=companies.id) AS selec
                ON 
                    accounts.username=selec.accounts_username
                WHERE
                    accounts.campaigns_id=?
                    AND
                    selec.weeks_week=?
            ) 
            AS 
                campaign_user_hours 
            JOIN 
                (
                SELECT 
                    companies_id, wage 
                FROM company_wage_history 
                WHERE 
                    company_wage_history.campaigns_id=?
                    AND
                    company_wage_history.weeks_week=?
                ) AS wage_hist
            ON 
                campaign_user_hours.companies_id=wage_hist.companies_id`, [campaigns_id, lastWeek, campaigns_id, week])
    }
}


// // // 0) Set week 1 user profits to 0 (DELETE AFTER FIRST WEEK)
// const m = new Modifications(db)
// m.setInitialUserProfitWeeks()

// 1) Calculate the Hourly Rate for the given week.
//    In this case Week=1 is already done (all 0).
//    IMPORTANT: Do for each campaign.
const c = new Calculations(db)
const campaigns_id = 1;
const week = 2; 

//3) 
c.getWagesForThisWeek(week, campaigns_id).then((result) => {
    return db.run("BEGIN TRANSACTION;").then(() => {
        const updates = result.map(c => {
            return db.run("REPLACE INTO company_wage_history VALUES (?, ?, ?, ?)", [c.companies_id, campaigns_id, week, c.hourlyRate])
        });
        return Promise.all(updates)
    }).then(() => {
        return db.run("COMMIT;")
    })  
})

// // 2) Get Modifier Rates (This includes updating them first)

// // 2a) Fixed Events
// const fixedEvents={id: {description: "", type: 1||2, data: 0.2||-0.2, company_id: 55}}
// // 2b) Event Cards
// const weeklyEvents={id: {description: "", type: 1||2, data: 0.2||-0.2, company_id: 55}}
// // 2c) Company Strike
// const strikeEvents={company_id: {workersOnStrike: 55, totalWorkers: 55}}
// // 2d) Career Boost
// const careerBoosts={username: {company_id: isSupervisor}}


// 3) Calculate each individual user's score
c.calculateUserScores(week, campaigns_id, null, null, null, null).then((res) => {
    console.log(res)
})

