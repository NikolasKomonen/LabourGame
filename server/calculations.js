const SQL = require('./database/sqliteIndex')
const path = require('path')

let db = new SQL(path.join(__dirname, 'database/dbFile.sqlite'));
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
                campaign_user_hours.companies_id=wage_hist.companies_id;`, [campaigns_id, lastWeek, campaigns_id, week])
    }

    updateStrikeTable(week, campaigns_id) {
        return db.run("BEGIN TRANSACTION;")
                .then(() => {
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
                })
                .then(() => {
                    return db.run("COMMIT;")
                })
    }

    updateTotalHours(campaigns_id, weeks_week) {
        return db.all(`
            REPLACE INTO user_total_company_hours 
                SELECT 
                    selec.accounts_username, selec.companies_id, COALESCE(total_hours, 0) + selec.hours
                FROM 
                    (SELECT 
                        accounts_username, companies_id, hours 
                    FROM 
                        user_game_selections 
                    WHERE 
                        weeks_week=? 
                        AND 
                        accounts_username IN (SELECT username FROM accounts WHERE campaigns_id=?)) AS selec 
                LEFT JOIN
                    user_total_company_hours AS totals 
                ON 
                    selec.accounts_username=totals.accounts_username
                    AND
                    selec.companies_id=totals.companies_id
            ;
        `, [weeks_week, campaigns_id])
    }

    /**
     * This assumes that user_total_company_hours AND user_career_history
     * have been brought up to date through all previous weeks
     */
    updateCareersTable(campaigns_id, week) {
        const lastWeek = week - 1
        const supervisorCandidates = {} // {company_id: []}
        const noCareerHistory = {}
        const statementsToRun = []
        return db.all(`
            SELECT
                tohist.accounts_username AS accounts_username, tohist.companies_id AS companies_id, is_supervisor, reached_supervisor, total_hours, regular_hours, supervisor_hours, selec.hours AS last_week_hours
            FROM
                (
                    SELECT 
                        totals.accounts_username AS accounts_username, totals.companies_id AS companies_id, total_hours, is_supervisor, reached_supervisor 
                    FROM 
                            (SELECT * FROM user_total_company_hours WHERE user_total_company_hours.accounts_username IN (SELECT username FROM accounts WHERE campaigns_id=?)) AS totals 
                        LEFT JOIN 
                            (SELECT *, max(weeks_week) FROM user_career_history GROUP BY accounts_username, companies_id) AS hist
                        ON 
                            totals.accounts_username=hist.accounts_username 
                            AND
                            totals.companies_id=hist.companies_id
                ) AS 
                    tohist
                JOIN 
                    companies
                ON
                    tohist.companies_id=companies.id
                LEFT JOIN 
                    (SELECT * FROM user_game_selections WHERE weeks_week=?) AS selec
                ON
                    tohist.accounts_username=selec.accounts_username
                    AND
                    tohist.companies_id=selec.companies_id
                    
                
                
                `, [campaigns_id, lastWeek])
        .then((rows) => {
            rows.forEach((row) => {
                let c = supervisorCandidates[row.companies_id]
                if(c == null) {
                    c = {}
                    c.candidates = []
                    c.isSupervisorChosen = false
                }
                if(c.isSupervisorChosen) {
                    return;
                }

                
                
                const totalHours = row.total_hours
                if(totalHours < row.regular_hours) { // is Nothing
                    return;
                }

                const noCareerKey = row.accounts_username + row.companies_id
                // No career history exists yet for this username+company 
                if(row.is_supervisor === null) { // null because of LEFT JOIN in query above
                    noCareerHistory[noCareerKey] = row
                }
                
                if(totalHours >= row.supervisor_hours) { // is eligible for Supervisor
                    if(row.is_supervisor) {
                        if(!row.last_week_hours) { // did not work last week, lose their supervisor position
                            statementsToRun.push(db.run("REPLACE INTO user_career_history VALUES (?, ?, ?, ?, ?)", [row.accounts_username, row.companies_id, week, false, true]))
                            return
                        }
                        else { // keep their supervisor position, making everything else meaningless
                            c.isSupervisorChosen = true
                            c.candidates = null // clear out candidates from memory
                            return
                        }
                    }
                    if(row.reached_supervisor) { // not a supervisor but reached it previously
                        return;
                    }
                    c.candidates.push(row)
                }
                else { //is eligible for Regular
                    delete noCareerHistory[noCareerKey]
                    statementsToRun.push(db.run("REPLACE into user_career_history VALUES (?, ?, ?, ?, ?)",[row.accounts_username, row.companies_id, week, false, false]))
                }
            })

            Object.keys(supervisorCandidates).forEach((key) => {
                const candidates = supervisorCandidates[key].candidates
                const length = candidates.length
                const newSupervisorIndex = Math.floor(Math.random() * Math.floor(length - 1))
                const newSupervisor = candidates[newSupervisorIndex]
                const noCareerKey = newSupervisor.accounts_username + newSupervisor.companies_id
                delete noCareerHistory[noCareerKey]
                statementsToRun.push(db.run("REPLACE INTO user_career_history VALUES (?, ?, ?, ?, ?)",[newSupervisor.accounts_username, newSupervisor.companies_id, week, true, true]))
            })

            return statementsToRun
        })
        .then((statementsToRun) => {
            return db.run("BEGIN TRANSACTION;")
            .then(() => {
                return Promise.all(statementsToRun)
            })
            .then(() => {
                return db.run("COMMIT;")
            })
        })
        
        
    }

    /**
     * Main function.
     * 
     * Think of this function as a verification function, where it will
     * go from the beginning of the game and process the game data.
     * 
     * For each week the hourly rate will be calculated with the data
     * from the previous week. The end result will be hourly rates up
     * to and including for the given week.
     * 
     * Preferably, for each week the individual week would be calculated
     * relying that the week's before it were previously calculated.
     * This can be done with calculateOnlyWeek().
     * @param {*} campaigns_id 
     * @param {*} week 
     */
    calculateUpToAndIncludingWeek(campaigns_id, week) {
        return this.c(campaigns_id, 2, week)
    }

    c(campaigns_id, current_week, max_week) {
        if(current_week > max_week) {
            return
        }
        else {
            return this.calculateOnlyWeek(campaigns_id, current_week).then(() => {
                return this.c(campaigns_id, current_week + 1, max_week)
            })
        }
    }

    calculateOnlyWeek(campaigns_id, week) {
        // ** DO NOT MODIFY ANY OF THE FOLLOWING **

        // 1) Calculate the Hourly Rate for the given week.
        //    In this case Week=1 is already done (all 0).
        //    IMPORTANT: Do for each campaign.
        
        const lastWeek = week - 1;

        return this.getWagesForThisWeek(lastWeek, campaigns_id) // JSON's of this week's wages
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
                this.updateStrikeTable(lastWeek, campaigns_id),
                this.updateTotalHours(campaigns_id, lastWeek)
                .then(() => {
                    this.updateCareersTable(campaigns_id, week)
                })
            ])
            
        })
        .then(() => {
            // // 2) Get Modifier Rates (This includes updating them first)
            return Promise.all([
            // // 2a) Fixed Events
            db.all("SELECT companies_id, description, event_types_id, event_data FROM fixed_event_cards WHERE weeks_week=?;", [week]),
            // // 2b) Event Cards

            // ******* NEED TO CHECK IF THIS ALREADY EXISTS IN THE EVENT CARD HISTORY
            db.get("SELECT id, companies_id, description, event_types_id, event_data FROM event_card_history JOIN event_cards ON event_card_history.event_cards_id=event_cards.id AND event_card_history.weeks_week=?", [lastWeek])
            .then((existingCard) => {
                if(existingCard) {
                    return existingCard
                }
                return db.get("SELECT id, companies_id, description, event_types_id, event_data FROM event_cards ORDER BY RANDOM() LIMIT 1;")
            }),
            // // 2c) Company Strike
            db.all("SELECT companies_id, workers_striked, total_workers FROM user_strike_weeks WHERE campaigns_id=? and weeks_week=?", [campaigns_id, lastWeek])
            // // 2d) Career Boost
            

            ])
        })
        .then((data) => {
            // update histories
            const eventCard = data[1]
            return Promise.all([
                db.run(`INSERT OR IGNORE INTO event_card_history VALUES (?, ?)`, [lastWeek, eventCard.id]) // This not replace because if it is randomly selected and may have already been chosen
            ]).then(() => {
                return data
            })
        })
        .then((data) => {
            // 3) Calculate each individual user's score
            return this.calculateUserScores(week, campaigns_id, data[0], data[1], data[2], null).then((res) => {
                const all = {}
                res.forEach(row => {
                    
                    if(all[row.username] == null) {
                        all[row.username] = 0
                    }
                    all[row.username]+=Math.round((row.wage*row.hours) * 100) / 100
                })
                return all
            })
        })
        .then((all) => {
            return db.all("SELECT username FROM accounts WHERE campaigns_id=?", [campaigns_id]).then((users) => {
                const final = []
                
                users.forEach(user => {
                    const username = user.username
                    let profit = all[username]
                    if(!profit) {
                        profit = 0
                    }
                    final.push({user: username, profit: profit})
                })
                
                
                console.log(final)
            })
            
        })
    }

    
}

const c = new Calculations(db);
const campaigns_id = 2

c.calculateUpToAndIncludingWeek(campaigns_id, 2)