const SQL = require('./database/sqliteIndex')
const path = require('path')
const { parse } = require('json2csv')
const fs = require('fs')

const euler = 2.7182818284590452353602874713527

class Calculations {

    // Previous Week Rate * Euler^(Difference/Baseline)

    constructor(db) {
        this.db = db
        this.table = {}
        this.thisWeeksCompanies = null;
    }

    calculateBaseline(week, campaigns_id) {
        return Promise.all([
            this.calculateTotalHours(week, campaigns_id),
            this.getThisWeeksCompaniesCount(week)
        ]).then((data) => {
            const sumHours = data[0]["sum(hours)"]
            const totalHours = sumHours == null ? 0 : sumHours
            const companiesCount = data[1]["company_count"]
            const baseline = totalHours / companiesCount
            return baseline
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
                        (SELECT * FROM user_game_selections WHERE weeks_week=? AND companies_id IN (SELECT id FROM companies WHERE starting_wage IS NOT NULL)) AS selections
                    ON 
                        users.username=selections.accounts_username 
                );
            
                `, [campaigns_id, week])
    }

    getThisWeeksCompanies(week) {
        return this.db.all(`SELECT id, name FROM companies WHERE id NOT IN (SELECT companies_id FROM weekly_excluded_companies WHERE weeks_week=?) AND companies.starting_wage IS NOT null ORDER BY name ASC;`, [week])
    }

    getThisWeeksCompaniesCount(week) {
        return this.db.get(`SELECT COUNT(*) AS company_count FROM companies WHERE id NOT IN (SELECT companies_id FROM weekly_excluded_companies WHERE weeks_week=?) AND companies.starting_wage IS NOT null;`, [week])
    }

    getTotalCompanyHours(week, companies_id, campaigns_id) {
        return this.db.get('SELECT sum(hours) FROM user_game_selections JOIN (SELECT * FROM accounts WHERE campaigns_id=?) ON username=accounts_username WHERE companies_id=? AND weeks_week=?;', [campaigns_id, companies_id, week])
    }

    getWeekWage(week, companies_id, campaigns_id) {
        return this.db.get(`SELECT max(weeks_week), wage FROM company_wage_history WHERE companies_id=? AND campaigns_id=? AND weeks_week<=? GROUP BY companies_id AND campaigns_id;`, [companies_id, campaigns_id, week])
    }

    getInitialWage(companies_id) {
        return this.db.get(`SELECT starting_wage AS wage FROM companies WHERE id=?`, [companies_id])
    }

    getResourcesForWeek(week, accounts_username) {
        return this.db.get(`SELECT * FROM user_game_weeks WHERE accounts_username=? AND weeks_week=?`, [accounts_username, week])
    }

    calculateHourlyRate(hourlyRate, difference, baseline) {
        return (hourlyRate * Math.pow(euler, (difference / baseline)))
    }

    getWage(week, companies_id, campaigns_id) {
        const lastWeek = week - 1
        const weekWage = week === 1 ? this.getInitialWage(companies_id) : this.getWeekWage(lastWeek, companies_id, campaigns_id)
        return weekWage.then(data => {
            // Edge case of a company going bankrupt and the new company coming in when it is not the first week.
            // We need to grab the initial wages because nothing else exists yet
            if (data == undefined) {
                return this.getInitialWage(companies_id)
            }
            return data
        })

    }

    calculateWageForCompany(baseline, week, companies_id, campaigns_id) {
        return new Promise((resolve, reject) => {
            const calculations = [
                this.getWage(week, companies_id, campaigns_id),
                this.getTotalCompanyHours(week, companies_id, campaigns_id)
            ]

            Promise.all(calculations).then((data) => {
                const hourlyRate = data[0].wage
                const totalCompanyHours = data[1]["sum(hours)"]
                const difference = baseline - (totalCompanyHours == null ? 0 : totalCompanyHours)
                let newHourlyRate = this.calculateHourlyRate(hourlyRate, difference, baseline)
                if (newHourlyRate > hourlyRate) {
                    const maxLimit = hourlyRate * 1.2
                    if (newHourlyRate > maxLimit) {
                        newHourlyRate = maxLimit
                    }
                }
                else {
                    const minLimit = hourlyRate * 0.8
                    if (newHourlyRate < minLimit) {
                        newHourlyRate = minLimit
                    }
                }
                resolve({ companies_id: companies_id, hourlyRate: newHourlyRate })
            })
        })
    }

    calculateWagesForWeek(week, campaigns_id) {
        return Promise.all([
            this.calculateBaseline(week, campaigns_id),
            this.getThisWeeksCompanies(week)
        ])
            .then((data) => {
                const baseline = data[0]
                const companies = data[1]
                return Promise.all(companies.map((row) => {
                    return this.calculateWageForCompany(baseline, week, row.id, campaigns_id)
                }))
            })
    }

    /**
     * 
     * @param {*} company_wages The output of `calculateWagesForWeek()`
     * @param {*} week 
     */
    dbUpdateWageForWeek(company_wages, week, campaigns_id) {
        return this.db.run("BEGIN TRANSACTION;")
            .then(() => {
                const updates = company_wages.map(c => {
                    return this.db.run("REPLACE INTO company_wage_history VALUES (?, ?, ?, ?);", [c.companies_id, campaigns_id, week, c.hourlyRate])
                });
                return Promise.all(updates)
            })
            .then(() => {
                return this.db.run("COMMIT;")
            })
    }

    getAllPartialUserResults(week, campaigns_id) {

        return this.db.all(
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
            `, [week, campaigns_id, week, campaigns_id, campaigns_id, week])

    }

    getPartialUserResults(username, week) {

        return this.db.all(
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
            `, [week, week, username, username, week, username, username, week])

    }

    getWeekLeaderboard(week, campaign_id) {
        return this.db.all('SELECT accounts_username AS username, printf("%.2f", week_profit) AS week_profit FROM user_profit_weeks WHERE weeks_week=? AND accounts_username IN (SELECT username FROM accounts WHERE campaigns_id=?) ORDER BY week_profit+0 DESC;', [week, campaign_id])
    }

    getAllTimeLeaderboard(week, campaign_id) {
        return this.db.all('SELECT accounts_username AS username, printf("%.2f", total_profit) AS total_profit FROM user_profit_weeks WHERE weeks_week=? AND accounts_username IN (SELECT username FROM accounts WHERE campaigns_id=?) ORDER BY total_profit+0 DESC;', [week, campaign_id])
    }

    /**
     * Only update the table with companies that have atleast 1 person striking for that week
     * @param {*} week 
     * @param {*} campaigns_id 
     */
    dbUpdateStrikeTable(week, campaigns_id) {
        return this.db.run("BEGIN TRANSACTION;")
            .then(() => {
                return this.db.run(`
                        REPLACE INTO user_strike_weeks
                            SELECT 
                                * 
                            FROM
                            (
                                SELECT
                                    companies_id,
                                    ?,
                                    ?,
                                    sum(selec.strike) AS workers_striked,
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
                                        AND
                                        weeks_week=?
                                    ) AS selec
                                GROUP BY
                                    selec.companies_id
                            ) AS allStrikes
                            WHERE 
                                allStrikes.workers_striked>0;       
                    `, [campaigns_id, week, campaigns_id, week, week])
            })
            .then(() => {
                return this.db.run("COMMIT;")
            })
    }

    dbUpdateTotalHours(campaigns_id, weeks_week) {
        let clean = undefined
        return this.db.run("BEGIN TRANSACTION;")
            .then(() => {
                if (weeks_week === 1) {
                    clean = this.db.run("DELETE FROM user_total_company_hours;")
                }

                const replacements =
                    this.db.run(`
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
                                accounts_username IN (SELECT username FROM accounts WHERE campaigns_id=?)
                                AND
                                companies_id IN (SELECT id FROM companies WHERE starting_wage IS NOT NULL)
                            )
                            AS selec 
                        LEFT JOIN
                            user_total_company_hours AS totals 
                        ON 
                            selec.accounts_username=totals.accounts_username
                            AND
                            selec.companies_id=totals.companies_id
                    ;
                    `, [weeks_week, campaigns_id])

                if (clean) {
                    return clean.then(() => {
                        return replacements
                    })
                }
                return replacements
            })
            .then(() => {
                return this.db.run("COMMIT;")
            })
    }

    /**
     * Using the data up to and including 'week', it will figure out a users career.
     * Then will update the career table with the correct positions
     * for next week (week + 1).
     * 
     * 
     * This assumes that user_total_company_hours AND user_career_history
     * have been brought up to date through all previous weeks
     */
    dbUpdateCareersTable(campaigns_id, week) {
        const nextWeek = week + 1
        const lastWeek = week - 1
        const supervisorCandidates = {} // {company_id: []}
        const noCareerHistory = {} // holds 
        let statementsToRun = []


        // Clear out any future regular careers set previously
        return this.db.run("DELETE FROM user_career_history WHERE accounts_username IN (SELECT username FROM accounts WHERE campaigns_id=?) AND weeks_week>=? AND is_supervisor IS FALSE", [campaigns_id, nextWeek])
            .then(() => {
                return this.db.all(`
                SELECT
                    tohist.accounts_username AS accounts_username, tohist.companies_id AS companies_id, is_supervisor, reached_supervisor, total_hours, regular_hours, supervisor_hours, selec.hours AS last_week_hours, career_week
                FROM
                (
                    SELECT 
                        totals.accounts_username AS accounts_username, totals.companies_id AS companies_id, total_hours, is_supervisor, reached_supervisor, hist.career_week AS career_week
                    FROM 
                            (SELECT * FROM user_total_company_hours WHERE user_total_company_hours.accounts_username IN (SELECT username FROM accounts WHERE campaigns_id=?)) AS totals 
                        LEFT JOIN 
                            (SELECT *, max(weeks_week) AS career_week FROM (SELECT * FROM user_career_history WHERE weeks_week <= ?) GROUP BY accounts_username, companies_id) AS hist
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
                `, [campaigns_id, nextWeek, lastWeek])
            })
            .then((rows) => {
                return this.db.run("BEGIN TRANSACTION;")
                    .then(() => {
                        rows.forEach((row) => {
                            let c = supervisorCandidates[row.companies_id]
                            if (c == null) {
                                supervisorCandidates[row.companies_id] = {}
                                c = supervisorCandidates[row.companies_id]
                                c.candidates = []
                                c.isSupervisorChosen = false
                            }

                            const userIsSupervisor = row.is_supervisor

                            const totalHours = row.total_hours
                            if (totalHours < row.regular_hours) { // is Nothing
                                if (userIsSupervisor) {
                                    statementsToRun.push(this.db.run('DELETE FROM user_career_history WHERE accounts_username=? AND companies_id=? AND weeks_week=?', [row.accounts_username, row.companies_id, row.career_week]))
                                }
                                return;
                            }

                            const noCareerKey = row.accounts_username + row.companies_id
                            // This user has not achieved any career at this company yet
                            if (row.is_supervisor === null) { // null because of LEFT JOIN in query above
                                noCareerHistory[noCareerKey] = row
                            }

                            if (totalHours >= row.supervisor_hours) { // is eligible for Supervisor
                                if (c.isSupervisorChosen) {
                                    if (userIsSupervisor) {
                                        statementsToRun.push(this.db.run('DELETE FROM user_career_history WHERE accounts_username=? AND companies_id=? AND weeks_week=?', [row.accounts_username, row.companies_id, row.career_week]))
                                    }
                                    if (row.is_supervisor === null) {
                                        delete noCareerHistory[noCareerKey]
                                        statementsToRun.push(this.db.run("REPLACE INTO user_career_history VALUES (?, ?, ?, ?, ?)", [row.accounts_username, row.companies_id, nextWeek, false, false]))
                                    }
                                    return;
                                }
                                if (row.is_supervisor) {
                                    if (week > 1 && row.last_week_hours != undefined && !row.last_week_hours) { // did not work last week, lose their supervisor position
                                        statementsToRun.push(this.db.run("REPLACE INTO user_career_history VALUES (?, ?, ?, ?, ?)", [row.accounts_username, row.companies_id, nextWeek, false, true]))
                                        return
                                    }
                                    else { // keep their supervisor position, making everything else meaningless
                                        c.isSupervisorChosen = true
                                        return
                                    }
                                }
                                if (row.reached_supervisor) { // not a supervisor but reached it previously
                                    if (userIsSupervisor) {
                                        statementsToRun.push(this.db.run('DELETE FROM user_career_history WHERE accounts_username=? AND companies_id=? AND weeks_week=?', [row.accounts_username, row.companies_id, row.career_week]))
                                    }
                                    return;
                                }
                                c.candidates.push(row) // is candidate for supervisor
                            }
                            else { //is eligible for Regular
                                if (userIsSupervisor) {
                                    statementsToRun.push(this.db.run('DELETE FROM user_career_history WHERE accounts_username=? AND companies_id=? AND weeks_week=?', [row.accounts_username, row.companies_id, row.career_week]))
                                }
                                delete noCareerHistory[noCareerKey]
                                statementsToRun.push(this.db.run("REPLACE INTO user_career_history VALUES (?, ?, ?, ?, ?)", [row.accounts_username, row.companies_id, nextWeek, false, false]))
                            }
                        })
                        return Promise.all(statementsToRun)
                            .then(() => {
                                statementsToRun = []
                                // These are the candidates who ('won'/were the only ones) to become supervisor
                                Object.keys(supervisorCandidates).forEach((key) => {
                                    const candidates = supervisorCandidates[key].candidates
                                    const length = candidates.length
                                    const newSupervisorIndex = Math.floor(Math.random() * Math.floor(length - 1))
                                    if (newSupervisorIndex < 0) {
                                        return
                                    }

                                    const newSupervisor = candidates[newSupervisorIndex]
                                    const noCareerKey = newSupervisor.accounts_username + newSupervisor.companies_id
                                    delete noCareerHistory[noCareerKey]
                                    statementsToRun.push(this.db.run("REPLACE INTO user_career_history VALUES (?, ?, ?, ?, ?)", [newSupervisor.accounts_username, newSupervisor.companies_id, nextWeek, true, true]))

                                    // make all other candidates regulars if they do no have a career history at the company
                                    candidates.forEach(candidate => {
                                        const newCareerKey = candidate.accounts_username + candidate.companies_id
                                        const info = noCareerHistory[newCareerKey]
                                        if (info) {
                                            statementsToRun.push(this.db.run("REPLACE INTO user_career_history VALUES (?, ?, ?, ?, ?)", [info.accounts_username, info.companies_id, nextWeek, false, false]))
                                        }
                                    })

                                    //Todo: wipe all future events of a supervisor at this company
                                    statementsToRun.push(this.db.run(`DELETE FROM user_career_history WHERE is_supervisor=1 AND companies_id=? AND weeks_week>=?`, [newSupervisor.companies_id, nextWeek + 1]))
                                })


                            })
                            .then(() => {
                                return Promise.all(statementsToRun)
                            })


                    })
                    .then(() => {
                        return this.db.run("COMMIT;")
                    })
            })
    }

    getMultipliers(week, campaigns_id) {
        return Promise.all([
            // // 2a) Fixed Events
            this.db.all("SELECT companies_id, description, event_types_id, event_data FROM fixed_event_cards WHERE weeks_week=? ORDER BY companies_id;", [week]),
            // // 2b) Event Cards
            this.db.get("SELECT id, companies_id, description, event_types_id, event_data FROM event_card_history JOIN event_cards ON event_card_history.event_cards_id=event_cards.id WHERE event_card_history.weeks_week=?;", [week])
                .then((existingCard) => {
                    if (existingCard) {
                        return existingCard
                    }
                    return this.getRandomEventCard(week).then((newCard) => { return newCard })
                }),
            // // 2c) Company Strike
            this.db.all("SELECT companies_id, workers_striked, total_workers FROM user_strike_weeks WHERE campaigns_id=? and weeks_week=? ORDER BY companies_id;", [campaigns_id, week]),
            // // 2d) Career Boost
            this.getCareers(campaigns_id, week)

        ])
    }

    /**
     * Returns all Regular+Supervisor careers
     * 
     * This should only be run after `dbUpdateCareersTable()` has been run since
     * it ensures the user_career_history table is up to date
     * @param {*} campaigns_id 
     */
    getCareers(campaigns_id, week) {
        return this.db.all("SELECT accounts_username, name AS company_name, companies_id, max(weeks_week), is_supervisor FROM user_career_history JOIN companies ON companies_id=id WHERE accounts_username IN (SELECT username FROM accounts WHERE campaigns_id=?) AND weeks_week<=? GROUP BY accounts_username, companies_id ORDER BY accounts_username, company_name;", [campaigns_id, week])
    }

    getRandomEventCard(week) {
        // Check if 2 Bankrupcy cards were played
        const bankrupcyCardLimit = 12 - 10 // ALL_NON_RESOURCE_COMPANIES-PLAYABLE_COMPANIES
        return this.db.get(`SELECT count(*) AS total FROM event_card_history JOIN event_cards ON event_card_history.event_cards_id=event_cards.id WHERE event_types_id=2`)
            .then(count => {
                const total = count.total
                if (total >= bankrupcyCardLimit) { // >= 2
                    return false
                }
                return true
            })
            .then((drawBankrupcyCard) => {
                if (drawBankrupcyCard) {
                    return this.db.get(`SELECT * FROM event_cards WHERE id NOT IN (SELECT event_cards_id FROM event_card_history) AND companies_id NOT IN (SELECT companies_id FROM weekly_excluded_companies WHERE weeks_week=?) ORDER BY RANDOM() LIMIT 1`, [week])
                }
                return this.db.get(`SELECT * FROM event_cards WHERE event_types_id!=2 AND id NOT IN (SELECT event_cards_id FROM event_card_history) AND companies_id NOT IN (SELECT companies_id FROM weekly_excluded_companies WHERE weeks_week=?) ORDER BY RANDOM() LIMIT 1`, [week])
            })
    }

    /**
     * Updates the available resources for the given week
     * @param {*} campaigns_id 
     * @param {*} week 
     */
    dbUpdateWeekResources(campaigns_id, week) {
        const lastWeek = week - 1
        return this.db.all(`SELECT username FROM accounts WHERE campaigns_id=?`, [campaigns_id]).then((usernames) => {
            usernames.forEach(user => {
                const username = user.username
                return Promise.all(
                    [
                        this.db.all(`SELECT 
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

                        this.db.get("SELECT * FROM user_game_weeks WHERE accounts_username=? AND weeks_week=?", [username, lastWeek]),
                        this.db.get(`SELECT * FROM user_profit_weeks WHERE accounts_username=? AND weeks_week=?`, [username, week]),
                        this.db.get(`SELECT * FROM user_game_weeks WHERE accounts_username=? AND weeks_week=?`, [username, week])
                    ]
                )
                    .then((queries) => {
                        const resourceHours = queries[0]
                        let [additional_brain, additional_muscle, additional_heart] = [0, 0, 0]
                        resourceHours.forEach(row => {
                            if (row.name === "MEDITATION") {
                                additional_heart = row.hours
                            }
                            else if (row.name === "GYM") {
                                additional_muscle = row.hours
                            }
                            else {
                                additional_brain = row.hours
                            }
                        });
                        // Figures out the Training done, and applies it to the new
                        // available resources for this week
                        const gameLastWeek = queries[1]

                        const available_brain = gameLastWeek.available_brain + additional_brain
                        const available_muscle = gameLastWeek.available_muscle + additional_muscle
                        const available_heart = gameLastWeek.available_heart + additional_heart

                        let submitted = false;
                        const gameThisWeek = queries[3]
                        if(gameThisWeek) {
                            submitted = gameThisWeek.submitted === 0 ? false : true
                        }


                        return this.db.run(`
                        REPLACE INTO 
                            user_game_weeks 
                        VALUES 
                            (?, ?, ?, ?, ?, ?) 
                        `
                            , [username, week, submitted, available_brain, available_muscle, available_heart])
                    })
            })

        })

    }

    /**
     * 
     * @param {*} week The week you want this card to be applied to
     * @param {*} eventCard 
     */
    dbUpdateTablesFromEventCard(week, eventCard) {
        const queryQueue = []
        const nextWeek = week + 1
        const companyID = eventCard.companies_id
        return this.db.run(`REPLACE INTO weekly_excluded_companies SELECT ?, companies_id, went_bankrupt FROM weekly_excluded_companies WHERE weeks_week=?`, [nextWeek, week])
            .then(() => {
                if (eventCard.event_types_id === 2) { // Company is bankrupt
                    queryQueue.push(
                        // Choose Random company from all currently excluded ones and make it available for next week
                        this.db.get(`
                            SELECT companies_id FROM weekly_excluded_companies WHERE weeks_week=? AND went_bankrupt=0 ORDER BY companies_id ASC LIMIT 1;
                        `, [week])
                            .then((query) => {
                                const joiningCompanyID = query.companies_id
                                return this.db.run("DELETE FROM weekly_excluded_companies WHERE companies_id=? AND weeks_week=?;", [joiningCompanyID, nextWeek])
                            })
                            .then(() => { // Exclude provided event card company from next week
                                return this.db.run(`
                            REPLACE INTO 
                                weekly_excluded_companies 
                            VALUES (?, ?, 1)
                            ;`,
                                    [nextWeek, companyID])
                            })
                    )
                }
                // Update the event card history
                queryQueue.push(this.db.run(`INSERT OR IGNORE INTO event_card_history VALUES (?, ?);`, [week, companyID]))
                return Promise.all(queryQueue)
            })

    }

    getUserResults(username, week) {
        return this.db.get("SELECT campaigns_id FROM accounts WHERE username=?;", [username])
            .then(campaigns_id => {
                return Promise.all([
                    this.getMultipliers(week, campaigns_id.campaigns_id),
                    this.getPartialUserResults(username, week)
                ])
            })
            .then((data) => {
                return this.getResults(data[0], data[1], week, false)
                    .then((rows) => {
                        return { rows: rows, multipliers: data[0] }
                    })
            })
    }

    calculateTotalProfits(campaigns_id, week) {
        const nextWeek = week + 1

        return this.calculateWagesForWeek(week, campaigns_id) // JSON's of this week's wages
            .then((result) => {
                return this.dbUpdateWageForWeek(result, week, campaigns_id)
            })
            .then(() => {
                // The following order matters
                return this.dbUpdateStrikeTable(week, campaigns_id)
                    .then(() => {
                        return this.dbUpdateTotalHours(campaigns_id, week) // This is a temporary table used for calculations
                            .then(() => {
                                return this.dbUpdateCareersTable(campaigns_id, week)
                            })
                    })
            })
            .then(() => {
                return this.dbUpdateWeekResources(campaigns_id, nextWeek)
            })
            .then(() => {
                return Promise.all([
                    this.getMultipliers(week, campaigns_id),
                    this.getAllPartialUserResults(week, campaigns_id)
                ])
            })
            .then(data => {
                // update histories
                const eventCard = data[0][1] // multipliers->eventcard
                this.dbUpdateTablesFromEventCard(week, eventCard)
                return data
            })
            .then((data) => {
                return this.getResults(data[0], data[1], week, true)
            })
    }

    /**
     * Calculates all results week-by-week and ends with (week + 1) wages/user_resources
     * @param {*} campaigns_id 
     * @param {*} week 
     */
    async calculateTotalProfitsVerified(campaigns_id, week) {
        let currentWeek = 1

        while (currentWeek <= week) {
            await this.calculateTotalProfits(campaigns_id, currentWeek)
            currentWeek++
        }
        if (currentWeek - 1 === week) {
            return true
        }
        return false;
    }

    getResults(multipliers, rows, week, updateUserProfits = Boolean) {
        const fixedCards = multipliers[0]
        const fixedCardsSearch = {}
        fixedCards.forEach(card => {
            const company_id = card.companies_id
            fixedCardsSearch[company_id] = card
        })
        const eventCard = multipliers[1]
        const eventCardCompany = eventCard.companies_id
        const strikeData = multipliers[2]
        const strikeDataSearch = {}
        strikeData.forEach(company => { // only has companies that attempted a strike
            const id = company.companies_id
            strikeDataSearch[id] = {}
            strikeDataSearch[id] = (company.workers_striked / company.total_workers) > 0.5
        });
        const careerData = multipliers[3]
        const careerDataSearch = {}
        careerData.forEach(career => {
            const username = career.accounts_username
            if (careerDataSearch[username] === undefined) {
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
            row.multiplierBreakdown = ""
            let noPayThisWeek = false
            let multiplier = 1
            if (eventCardCompany === id) {
                const type = eventCard.event_types_id
                if (type === 2) { // Out of Business
                    noPayThisWeek = true
                    multiplier = 0
                }
                else {
                    const wageChange = eventCard.event_data
                    if (wageChange === 0) { // Lose pay for this week
                        multiplier = 0
                        noPayThisWeek = true
                    }
                    else {
                        multiplier += wageChange
                        row.multiplierBreakdown += "EventCard: " + eventCard.event_data + ", "
                    }
                }
            }

            if (!noPayThisWeek && fixedCardsSearch[id] !== undefined) {
                const fixedCard = fixedCardsSearch[id]
                multiplier += fixedCard.event_data
                row.multiplierBreakdown += "FixedEventCard: " + fixedCard.event_data + ", "
            }

            const isSupervisor = careerDataSearch[username] === undefined ? undefined : careerDataSearch[username][id]

            if (!noPayThisWeek) {
                const workersStriked = strikeDataSearch[id] !== undefined && strikeDataSearch[id]
                let strikeSuccessful;

                if (isSupervisor !== undefined) { // is supervisor or regular
                    if (isSupervisor) {
                        multiplier += 0.2 // supervisor bonus
                        row.multiplierBreakdown += "SupervisorBonus: 0.2, "
                        if (workersStriked) {
                            if (!strikeSuccessful) {
                                multiplier += (5 / wage) // prevented strike bonus
                                row.multiplierBreakdown += "SupervisorPreventedStrikeBonus: " + (5 / wage) + ", "
                            }
                            else {
                                multiplier = 0 // strike won, supervisor loses pay
                                row.multiplierBreakdown = ""
                            }
                        }
                    }
                    else { // is regular
                        multiplier += 0.05 // regular increase
                        if (workersStriked) {
                            if (userStriked) { // the strike won and they were a part of it
                                if (strikeSuccessful) {
                                    multiplier += (5 / wage)
                                    row.multiplierBreakdown += "RegularStrikeWin: " + (5 / wage) + ", "
                                }
                                else {
                                    multiplier = 0
                                    row.multiplierBreakdown = ""
                                }
                            }

                        }
                    }
                }
                else { // noPosition
                    if (workersStriked) {
                        if (userStriked) { // the strike won and they were a part of it
                            if (strikeSuccessful) {
                                multiplier += (5 / wage)
                                row.multiplierBreakdown += "NoCareerStrikeWin: " + (5 / wage) + ", "
                            }
                            else {
                                multiplier = 0
                                row.multiplierBreakdown = ""
                            }
                        }
                    }
                }
            }
            else { // company went bankrupt
                multiplier = 0
                row.multiplierBreakdown = ""
            }

            const newWage = wage * multiplier

            if (multiplier === 1) {
                row.wage = Math.floor(newWage * 100) / 100
            }
            else {
                row.wage = "" + (Math.floor(newWage * 100) / 100) + "(" + (Math.floor(wage * 100) / 100) + "*" + multiplier + ")"
            }
            const pay = newWage * hours
            row.pay = Math.floor(pay * 100) / 100
            if (totals[username] === undefined) {
                totals[username] = pay
            }
            else {
                totals[username] += pay
            }

            let careerName = "None"
            if (isSupervisor !== undefined) {
                if (isSupervisor) {
                    careerName = "Supervisor"
                }
                else {
                    careerName = "Regular"
                }
            }
            row.career = careerName
        });
        if (updateUserProfits) {
            return this.db.run("BEGIN TRANSACTION;")
                .then(() => {
                    const totalsUpdates = []
                    Object.keys(totals).forEach(key => {
                        const username = key
                        const week_profit = totals[username]
                        if (week === 1) {
                            totalsUpdates.push(this.db.run("REPLACE INTO user_profit_weeks VALUES (?, ?, ?, ?);", [username, week, week_profit, week_profit]))
                        }
                        else {
                            totalsUpdates.push(this.db.run("REPLACE INTO user_profit_weeks VALUES (?, ?, ?, ?+(SELECT total_profit FROM user_profit_weeks WHERE accounts_username=? AND weeks_week=?));", [username, week, week_profit, week_profit, username, week - 1]))
                        }
                    })
                    return Promise.all(totalsUpdates)
                })
                .then(() => {
                    return this.db.run("COMMIT;")
                })
                .then(() => {
                    return rows
                })
        }
        return Promise.resolve(rows)
    }
}


const db = new SQL(path.join(__dirname, "database/dbFile.sqlite"))
db.startDB().then(() => {
    const c = new Calculations(db);
    c.calculateTotalProfitsVerified(1, 3)


})

module.exports = Calculations