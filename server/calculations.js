const SQL = require('./database/sqliteIndex')
const path = require('path')
const {parse} = require('json2csv')
const fs = require('fs')

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
           const sumHours = data[0]["sum(hours)"]
           const totalHours = sumHours == null ? 0 : sumHours
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
        return this.db.all(`SELECT id, name FROM companies WHERE id NOT IN (SELECT companies_id FROM weekly_excluded_companies WHERE weeks_week=?) AND companies.starting_wage IS NOT null ORDER BY name ASC;`, [week])
    }

    getThisWeeksCompaniesCount(week) {
        return this.db.get(`SELECT COUNT(*) FROM companies WHERE id NOT IN (SELECT companies_id FROM weekly_excluded_companies WHERE weeks_week=?) AND companies.starting_wage IS NOT null;`, [week])
    }

    getTotalCompanyHours(week, companies_id, campaigns_id) {
        return this.db.get('SELECT sum(hours) FROM user_game_selections JOIN (SELECT * FROM accounts WHERE campaigns_id=?) ON username=accounts_username WHERE companies_id=? AND weeks_week=?;', [campaigns_id, companies_id, week])
    }

    getWeekWage(week, companies_id, campaigns_id) {
        return this.db.get(`SELECT max(weeks_week), wage FROM company_wage_history WHERE companies_id=? AND campaigns_id=? AND weeks_week<=? GROUP BY companies_id AND campaigns_id;`, [companies_id, campaigns_id, week])
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
                const totalCompanyHours = data[1]["sum(hours)"]
                const difference = baseline - (totalCompanyHours == null ? 0 : totalCompanyHours)
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

    calculateWagesForWeek(week, campaigns_id) {
        return this.getThisWeeksCompanies(week).then((companies) => {
            return Promise.all(companies.map((row) => {
                return this.calculateWageForCompany(week, row.id, campaigns_id)
            }))
        })
    }

    getAllPartialUserResults(week, campaigns_id) {
        const lastWeek = week - 1
        return db.all(
            `
            SELECT 
                username, user_comp.id AS id, COALESCE(strike, 0) AS strike, name, wage, COALESCE(hours, 0) AS hours, 0 AS pay, COALESCE(total_hours, 0) AS total_hours 
            FROM 
                (SELECT username, name, id FROM 
                    (SELECT id, name FROM companies WHERE id NOT IN (SELECT companies_id FROM weekly_excluded_companies WHERE weeks_week=?) AND companies.starting_wage IS NOT null) AS week_companies
                    LEFT JOIN 
                    (SELECT username FROM accounts WHERE campaigns_id=?)) 
                    AS user_comp
            LEFT JOIN
                (SELECT * FROM user_game_selections WHERE weeks_week=? AND accounts_username IN (SELECT username FROM accounts WHERE campaigns_id=?)) AS selec
            ON
                user_comp.username=selec.accounts_username
                AND
                user_comp.id=selec.companies_id
            LEFT join
                (
                SELECT companies_id, wage, max(weeks_week) FROM company_wage_history WHERE company_wage_history.campaigns_id=? AND company_wage_history.weeks_week<=? GROUP BY companies_id
                ) AS wage_hist
            ON
                user_comp.id=wage_hist.companies_id
            LEFT JOIN
                user_total_company_hours
            ON
                username=user_total_company_hours.accounts_username
                AND
                user_comp.id=user_total_company_hours.companies_id
            ORDER BY
                username, name ASC;
            `, [lastWeek, campaigns_id, lastWeek, campaigns_id, campaigns_id, week])
        
    }

    getPartialUserResults(username, week) {
        const lastWeek = week - 1
        
        return db.all(
            `
            SELECT 
                user_comp.id AS id, COALESCE(strike, 0) AS strike, name, wage, COALESCE(hours, 0) AS hours, 0 AS pay, COALESCE(totals.total_hours, 0) AS total_hours 
            FROM 
                (SELECT id, name FROM companies WHERE id NOT IN (SELECT companies_id FROM weekly_excluded_companies WHERE weeks_week=?) AND companies.starting_wage IS NOT null)
                    AS user_comp
            LEFT JOIN
                (SELECT * FROM user_game_selections WHERE weeks_week=? AND accounts_username=?) AS selec
            ON
                user_comp.id=selec.companies_id
            LEFT join
                (
                SELECT companies_id, wage, max(weeks_week) FROM company_wage_history WHERE company_wage_history.campaigns_id=(SELECT campaigns_id FROM accounts WHERE username=?) 
                AND company_wage_history.weeks_week<=? GROUP BY companies_id
                ) AS wage_hist
            ON
                user_comp.id=wage_hist.companies_id
            LEFT JOIN
                (SELECT * FROM user_total_company_hours WHERE accounts_username=?) AS th
            ON
                user_comp.id=th.companies_id
            LEFT JOIN
                (SELECT companies_id, sum(hours) AS total_hours FROM (SELECT * FROM user_game_selections WHERE accounts_username=? AND weeks_week<=?) GROUP BY companies_id) AS totals
            ON
                totals.companies_id=user_comp.id
            ORDER BY
                name ASC;
            `, [lastWeek, lastWeek, username, username, week, username, username, lastWeek])
        
    }

    getWeekLeaderboard(week, campaign_id) {
        return db.all('SELECT accounts_username AS username, printf("%.2f", week_profit) AS week_profit FROM user_profit_weeks WHERE weeks_week=? AND accounts_username IN (SELECT username FROM accounts WHERE campaigns_id=?) ORDER BY week_profit DESC;', [week, campaign_id])
    }

    getAllTimeLeaderboard(week, campaign_id) {
        return db.all('SELECT accounts_username AS username, printf("%.2f", total_profit) AS total_profit FROM user_profit_weeks WHERE weeks_week=? AND accounts_username IN (SELECT username FROM accounts WHERE campaigns_id=?) ORDER BY total_profit DESC;', [week, campaign_id])
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
                                    accounts_username IN (SELECT username FROM accounts WHERE campaigns_id=?)
                                    AND
                                    companies_id IN (SELECT id FROM companies WHERE id NOT IN (SELECT companies_id FROM weekly_excluded_companies WHERE weeks_week=?) AND companies.starting_wage IS NOT null )
                                ) AS selec
                            GROUP BY
                                selec.companies_id;       
                    `, [campaigns_id, week, campaigns_id, week])
                })
                .then(() => {
                    return db.run("COMMIT;")
                })
    }

    updateTotalHours(campaigns_id, weeks_week) {
        let clean = undefined
        return db.run("BEGIN TRANSACTION;")
            .then(() => {
                if(weeks_week === 1) {
                clean = db.run("DELETE FROM user_total_company_hours;")
                }

                const replacements = 
                    db.run(`
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
                                accounts_username IN (SELECT username FROM accounts WHERE campaigns_id=?)) 
                            AS selec 
                        LEFT JOIN
                            user_total_company_hours AS totals 
                        ON 
                            selec.accounts_username=totals.accounts_username
                            AND
                            selec.companies_id=totals.companies_id
                    ;
                    `, [weeks_week, campaigns_id])

                if(clean) {
                    return clean.then(() => {
                        return replacements
                    })
                }
                return replacements
            })
            .then(() => {
                return db.run("COMMIT;")
            }) 
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
                return db.run("DELETE FROM user_career_history WHERE accounts_username IN (SELECT username FROM accounts WHERE campaigns_id=?) AND weeks_week=?", [campaigns_id, week])
            })
            .then(() => {
                return Promise.all(statementsToRun)
            })
            .then(() => {
                return db.run("COMMIT;")
            })
        })
        
        
    }

    getMultipliers(week, campaigns_id) {
        const lastWeek = week - 1
        return Promise.all([
            // // 2a) Fixed Events
            db.all("SELECT companies_id, description, event_types_id, event_data FROM fixed_event_cards WHERE weeks_week=?;", [week]),
            // // 2b) Event Cards
            db.get("SELECT id, companies_id, description, event_types_id, event_data FROM event_card_history JOIN event_cards ON event_card_history.event_cards_id=event_cards.id AND event_card_history.weeks_week=?;", [lastWeek])
            .then((existingCard) => {
                if(existingCard) {
                    return existingCard
                }
                return db.get("SELECT id, companies_id, description, event_types_id, event_data FROM event_cards ORDER BY RANDOM() LIMIT 1;").then((newCard) => {return newCard})
            }),
            // // 2c) Company Strike
            db.all("SELECT companies_id, workers_striked, total_workers FROM user_strike_weeks WHERE campaigns_id=? and weeks_week=?;", [campaigns_id, lastWeek]),
            // // 2d) Career Boost
            db.all("SELECT accounts_username, companies_id, max(weeks_week), is_supervisor FROM user_career_history WHERE accounts_username IN (SELECT username FROM accounts WHERE campaigns_id=?) GROUP BY accounts_username;", [campaigns_id])

            ])
    }

    updateWeekResources(campaigns_id, week) {
        const lastWeek = week - 1
        return db.all(`SELECT username FROM accounts WHERE campaigns_id=?`, [campaigns_id]).then((usernames) => {
            usernames.forEach(user => {
                const username = user.username
                return Promise.all(
                    [
                        db.all(`SELECT 
                                    companies.name, hours 
                                FROM 
                                    companies
                                JOIN
                                    user_game_selections
                                ON
                                    companies.id=user_game_selections.companies_id
                                WHERE 
                                    accounts_username=? 
                                    AND
                                    weeks_week=?
                                    AND
                                    companies.name IN ('MEDITATION', 'GYM', 'TUTORIAL') 
                                ORDER BY 
                                    companies.name`
                            , [username, lastWeek]),
                
                        db.get("SELECT * FROM user_game_weeks WHERE accounts_username=? AND weeks_week=?", [username, lastWeek]),
                        db.get(`SELECT * FROM user_profit_weeks WHERE accounts_username=? AND weeks_week=?`, [username, week])
                    ]
                )
                .then((queries) => {
                    const resourceHours = queries[0]
                    let [additional_brain, additional_muscle, additional_heart] = [0, 0, 0]
                    resourceHours.forEach(row => {
                        if(row.name === "MEDITATION") {
                            additional_heart = row.hours
                        }
                        else if(row.name === "GYM") {
                            additional_muscle = row.hours
                        }
                        else {
                            additional_brain = row.hours
                        }
                    });
                    // Figures out the Training done, and applies it to the new
                    // available resources for this week
                    const gameWeek = queries[1]
                    
                    const available_brain = gameWeek.available_brain+additional_brain
                    const available_muscle = gameWeek.available_muscle+additional_muscle
                    const available_heart = gameWeek.available_heart+additional_heart
                    
                   
                    db.run(`
                        REPLACE INTO 
                            user_game_weeks 
                        VALUES 
                            (?, ?, ?, ?, ?, ?) 
                        `
                        , [username, week, false,available_brain,available_muscle, available_heart])
                })
            })
            
        })
        
    }

    getUserResults(username, week) {
        return db.get("SELECT campaigns_id FROM accounts WHERE username=?;", [username])
        .then(campaigns_id => {
            return Promise.all([
                this.getMultipliers(week, campaigns_id.campaigns_id),
                this.getPartialUserResults(username, week)
            ])
        })
        .then((data) => {
            return this.getResults(data[0], data[1], week, false)
        })
    }

    calculateTotalProfits(campaigns_id, week) {
        return Promise.all([
            this.getMultipliers(week),
            this.getAllPartialUserResults(week, campaigns_id)
        ])
        .then((data) => {
            return this.getResults(data[0], data[1], week, true)
        })
        
    }

    getResults(multipliers, rows, week, updateUserProfits = Boolean) {
        const fixedCards = multipliers[0]
        const fixedCardsSearch = {}
        fixedCards.forEach(card => {
            const company_id = card.companies_id
            fixedCardsSearch[company_id] = {card}
        })
        const eventCard = multipliers[1]
        const eventCardCompany = eventCard.companies_id
        const strikeData = multipliers[2]
        const strikeDataSearch = {}
        strikeData.forEach(company => { // only has companies that attempted a strike
            const id = company.companies_id
            strikeDataSearch[id] = {}
            strikeDataSearch[id] = (company.workers_striked/company.total_workers) > 0.5
        });
        const careerData = multipliers[3]
        const careerDataSearch = {}
        careerData.forEach(career => {
            const username = career.accounts_username
            if(careerDataSearch[username] === undefined) {
                careerDataSearch[username] = {}
            }
            const id = career.companies_id
            careerDataSearch[username][id] = career.is_supervisor
        })

        const totals = {}
        
        rows.forEach(row => {
            
            const username = row.username
            const id = row.id
            const wage = row.wage
            const hours = row.hours
            const userStriked = row.strike

            let bankrupt = false
            let multiplier = 1
            if(eventCardCompany === id) {
                const type = eventCard.event_types_id
                if(type === 2) { // Out of Business
                    bankrupt = true
                }
                else {
                    multiplier += eventCard.event_data
                }
            }

            if(!bankrupt && fixedCardsSearch[id] !== undefined) {
                const fixedCard = fixedCardsSearch[id]
                if(fixedCard.event_types_id === 2) { // Out of Business
                    bankrupt = true
                }
                else {
                    multiplier += fixedCard.event_data
                }
            }

            const isSupervisor = careerDataSearch[username] === undefined ? undefined : careerDataSearch[username][id]
            
            if(!bankrupt) { 
                const workersStriked = strikeDataSearch[id] !== undefined
                let strikeSuccessful;
                if(workersStriked) {
                    strikeSuccessful = strikeDataSearch[id]
                } 
                
                if(isSupervisor !== undefined) { // is supervisor or regular
                    if(isSupervisor) {
                        multiplier += 0.2 // supervisor bonus
                        if(workersStriked) {
                            if(!strikeSuccessful) {
                                multiplier += (5/wage) // prevented strike bonus
                            }
                            else {
                                multiplier = 0 // strike won, supervisor loses pay
                            }
                        } 
                    }
                    else { // is regular
                        multiplier += 0.05 // regular increase
                        if(workersStriked) {
                            if(userStriked) { // the strike won and they were a part of it
                                if(strikeSuccessful) {
                                    multiplier += (5/wage)
                                }
                                else {
                                    multiplier = 0
                                } 
                            }
                        
                        }
                    }
                }
                else { // noPosition
                    if(workersStriked) {
                        if(userStriked) { // the strike won and they were a part of it
                            if(strikeSuccessful) {
                                multiplier += (5/wage)
                            }
                            else {
                                multiplier = 0
                            } 
                        }
                    }
                }
            }
            else { // company went bankrupt
                multiplier = 0
            }

            const newWage = wage*multiplier
            
            if(multiplier === 1) {
                row.wage = Math.floor(newWage*100)/100
            }
            else {
                row.wage = ""+(Math.floor(newWage*100)/100)+"("+(Math.floor(wage*100)/100)+"*"+multiplier+")"
            }
            const pay = newWage*hours
            row.pay = Math.floor(pay*100)/100
            if(totals[username] === undefined) {
                totals[username] = pay
            }
            else {
                totals[username] += pay
            }
            
            let careerName = "None"
            if(isSupervisor !== undefined) {
                if(isSupervisor) {
                    careerName = "Supervisor"
                }
                else {
                    careerName = "Regular"
                }
            }
            row.career = careerName

            
        });
        if(updateUserProfits) {
            return db.run("BEGIN TRANSACTION;").then(() => {
                const totalsUpdates = []
                Object.keys(totals).forEach(key => {
                    const username = key
                    const week_profit = totals[username]
                    if(week === 1) {
                        totalsUpdates.push(db.run("REPLACE INTO user_profit_weeks VALUES (?, ?, ?, ?);", [username, week, week_profit, week_profit]))
                    }
                    else {
                        totalsUpdates.push(db.run("REPLACE INTO user_profit_weeks VALUES (?, ?, ?, ?+(SELECT total_profit FROM user_profit_weeks WHERE accounts_username=? AND weeks_week=?));", [username, week, week_profit, week_profit, username, week]))
                    }
                })
                return Promise.all(totalsUpdates).then(() => {return db.run("COMMIT;")})
            }) 
            .then(() => {return rows})
        }
        else {
            return rows
        }
        
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

        return this.calculateWagesForWeek(lastWeek, campaigns_id) // JSON's of this week's wages
        .then((result) => {
            // Inserting the wages into the DB
            return db.run("BEGIN TRANSACTION;").then(() => {
                const updates = result.map(c => {
                    return db.run("REPLACE INTO company_wage_history VALUES (?, ?, ?, ?);", [c.companies_id, campaigns_id, week, c.hourlyRate])
                });
                return Promise.all(updates).then(() => {
                    return db.run("COMMIT;")
                })
            })
        })
        .then(() => { // Updated/Calculate required pieces of data   
            return this.updateStrikeTable(lastWeek, campaigns_id)
                    .then(() => {
                        return this.updateTotalHours(campaigns_id, lastWeek) // This is a temporary table used for calculations
                    })
                    .then(() => {
                        return this.updateCareersTable(campaigns_id, week)
                    })
                    .then(() => {
                        return this.updateWeekResources(campaigns_id, week)
                    })
        })
        .then(() => {
            // // 2) Get Modifier Rates After being updated before
            return this.getMultipliers(week)
        })
        .then((data) => {
            // update histories
            const eventCard = data[1]
            return Promise.all([
                db.run(`INSERT OR IGNORE INTO event_card_history VALUES (?, ?);`, [lastWeek, eventCard.id]) // This does not 'replace' because it is randomly selected and may have already been chosen
            ]).then(() => {
                return data
            })
        })
        .then((multipliers) => {

            // 3) Calculate each individual user's score
            return this.getAllPartialUserResults(week, campaigns_id).then((scores) => {
                // Format: username, id, name, wage, hours 
               return this.calculateTotalProfits(multipliers, scores, lastWeek)
            })
        })
        .then((data) => {
            const csv = parse(data)
            fs.writeFile(path.join(__dirname, 'database/results.csv'), csv, (err) => {
                if(err) console.log(err);
                console.log("Saved!")
            })
        })
    }
}




const c = new Calculations(db);

//c.calculateUpToAndIncludingWeek(2, 2)


module.exports = Calculations