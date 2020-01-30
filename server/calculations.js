const SQL = require('./database/sqliteIndex')
const path = require('path')

let db = new SQL(path.join(__dirname, 'database/fukWitMe.sqlite'));
db.startDB()


const euler=2.7182818284590452353602874713527

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
        return this.getThisWeeksCompanies(week).then((companies) => {
            return Promise.all(companies.map((row) => {
                return this.calculateWageForCompany(week, row.id, campaigns_id)
            }))
        })
    }

    calculateUserScores(week, campaigns_id, fixedEvents, weeklyEvents, strikeEvents, careerBoosts) {
        const lastWeek = week - 1
        return db.all(
            `SELECT username, campaign_user_hours.company_name, wage, hours FROM 
            (
                SELECT 
                    username, companies_id, name AS company_name, hours 
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

    updateStrikeTable(week, campaigns_id) {
        
        return db.run(`
            REPLACE INTO user_strike_weeks
                SELECT
                    companies_id,
                    ?,
                    ?,
                    sum(selec.strike),
                    count(*)
                FROM 
                    (
                    SELECT 
                        companies_id, strike 
                    FROM 
                        user_game_selections 
                    WHERE 
                        accounts_username 
                        IN 
                        (SELECT username FROM accounts WHERE campaigns_id=?)
                    ) AS selec
                GROUP BY
                    selec.companies_id;
                    
            `, [campaigns_id, week, campaigns_id])
            
            
        
    }

    updateCareersTable() {
        db.run(`
            INSERT INTO user_career_history VALUES(
                SELECT * 
        ) ON CONFLICT DO UPDATE SET `)
    }

    updateTotalHours(campaigns_id) {
        return db.run(`
            REPLACE INTO user_total_company_hours VALUES (
                SELECT 
                    accounts_username,
                    companies_id,
                    sum(hours)
                FROM
                    (SELECT * FROM user_game_selections WHERE accounts_username IN (SELECT * FROM accounts WHERE campaigns_id=?)) AS accs
                GROUP BY
                    accs.accounts_username,
                    accs.companies_id
                    
            )
        
        `)
    }
}


// *** START HERE ***
// Modify these values
const campaigns_id = 1;
const week = 2; 

// ** DO NOT MODIFY ANY OF THE FOLLOWING **

// 1) Calculate the Hourly Rate for the given week.
//    In this case Week=1 is already done (all 0).
//    IMPORTANT: Do for each campaign.
const c = new Calculations(db)
const lastWeek = week - 1;

c.getWagesForThisWeek(lastWeek, campaigns_id) // JSON's of this week's wages
.then((result) => {
    // Inserting the wages into the DB
    return db.run("BEGIN TRANSACTION;").then(() => {
        const updates = result.map(c => {
            return db.run("REPLACE INTO company_wage_history VALUES (?, ?, ?, ?)", [c.companies_id, campaigns_id, week, c.hourlyRate])
        });
        return Promise.all(updates).then(() => {
            return db.run("COMMIT;")
        })
    })
})
.then(() => { // Updated the DB user_strike_weeks table
    return Promise.all([
        c.updateStrikeTable(lastWeek, campaigns_id)
        // c.updateTotalHours(campaigns_id)
        // .then(() => {
        //     c.updateCareersTable(campaigns_id, week)
        // })
    ])
     
})
.then(() => {
    // // 2) Get Modifier Rates (This includes updating them first)
    return Promise.all([
    // // 2a) Fixed Events
    // const fixedEvents={id: {description: "", type: 1||2, data: 0.2||-0.2, company_id: 55}}
    db.all("SELECT companies_id, description, event_types_id, event_data FROM fixed_event_cards WHERE weeks_week=?;", [week]),
    // // 2b) Event Cards
    // const weeklyEvents={id: {description: "", type: 1||2, data: 0.2||-0.2, company_id: 55}}
    db.get("SELECT companies_id, description, event_types_id, event_data FROM event_cards ORDER BY RANDOM() LIMIT 1;"),
    // // 2c) Company Strike
    // const strikeEvents={company_id: {workers_striked: 55, total_workers: 55}}
    db.all("SELECT companies_id, workers_striked, total_workers FROM user_strike_weeks WHERE campaigns_id=? and weeks_week=?", [campaigns_id, lastWeek])
    
    // // 2d) Career Boost
    // const careerBoosts={username: {company_id: isSupervisor}}

    ])
})
.then((data) => {
    // 3) Calculate each individual user's score
    c.calculateUserScores(week, campaigns_id, data[0], data[1], data[2], null).then((res) => {
        console.log(res)
    })
})



