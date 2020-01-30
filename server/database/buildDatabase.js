const SQL = require('./sqliteIndex')
const path = require('path')
const db = new SQL(path.join(__dirname, 'dbFile.sqlite'));

function createTables() {
    return new Promise((resolve, reject) => {
        console.log("CREATING TABLES")

        const campaigns =
            `CREATE TABLE IF NOT EXISTS campaigns (
                    id INTEGER PRIMARY KEY,
                    name varchar(40)
                )`

        const accounts =
            `CREATE TABLE IF NOT EXISTS accounts (
                    username varchar(40) PRIMARY KEY,
                    password varchar(255),
                    salt varchar(16),
                    admin binary DEFAULT 0,
                    campaigns_id varchar(40),
                    FOREIGN KEY (campaigns_id) REFERENCES campaigns(id)
                )`

        const companies =
            `CREATE TABLE IF NOT EXISTS companies (
                    id integer PRIMARY KEY,
                    name text UNIQUE,
                    brain integer,
                    muscle integer,
                    heart integer,
                    starting_wage integer,
                    regular_hours integer,
                    supervisor_hours
                )`

        const weekly_excluded_companies =
            `CREATE TABLE IF NOT EXISTS weekly_excluded_companies (
                    weeks_week integer,
                    companies_id integer,
                    PRIMARY KEY (weeks_week, companies_id),
                    FOREIGN KEY (weeks_week) REFERENCES weeks(week),
                    FOREIGN KEY (companies_id) REFERENCES companies(id)
                )`

        const weeks =
            `CREATE TABLE IF NOT EXISTS weeks (
                    week integer PRIMARY KEY
                )`

        const user_strike_weeks = 
                `
                CREATE TABLE IF NOT EXISTS user_strike_weeks (
                    companies_id integer,
                    campaigns_id integer,
                    weeks_week integer,
                    workers_striked integer,
                    total_workers integer,
                    PRIMARY KEY (companies_id, campaigns_id, weeks_week),
                    FOREIGN KEY (campaigns_id) REFERENCES campaigns(id),
                    FOREIGN KEY (companies_id) REFERENCES companies(id),
                    FOREIGN KEY (weeks_week) REFERENCES weeks(week)
                )
                `

        const user_game_selections =
            `CREATE TABLE IF NOT EXISTS user_game_selections (
                    accounts_username varchar(40),
                    companies_id integer,
                    weeks_week integer,
                    hours integer DEFAULT 0,
                    strike boolean DEFAULT FALSE,
                    PRIMARY KEY (accounts_username, companies_id, weeks_week),
                    FOREIGN KEY(accounts_username) REFERENCES accounts(username) ON DELETE CASCADE ON UPDATE CASCADE,
                    FOREIGN KEY(companies_id) REFERENCES companies(id),
                    FOREIGN KEY(weeks_week) REFERENCES weeks(week)
                )`

        const user_game_weeks =
            `CREATE TABLE IF NOT EXISTS user_game_weeks (
                    accounts_username varchar(40),
                    weeks_week integer,
                    submitted binary DEFAULT 0,
                    available_brain integer,
                    available_muscle integer,
                    available_heart integer,
                    PRIMARY KEY (accounts_username, weeks_week),
                    FOREIGN KEY(accounts_username) REFERENCES accounts(username) ON DELETE CASCADE ON UPDATE CASCADE,
                    FOREIGN KEY(weeks_week) REFERENCES weeks(week)
                )`

        const user_profit_weeks =
            `CREATE TABLE IF NOT EXISTS user_profit_weeks (
                    accounts_username varchar(40),
                    weeks_week integer,
                    week_profit integer DEFAULT 0,
                    total_profit integer DEFAULT 0,
                    PRIMARY KEY (accounts_username, weeks_week),
                    FOREIGN KEY(accounts_username) REFERENCES accounts(username) ON DELETE CASCADE ON UPDATE CASCADE,
                    FOREIGN KEY (weeks_week) REFERENCES weeks(week)
                )`

        const company_wage_history =
            `CREATE TABLE IF NOT EXISTS company_wage_history (
                    companies_id integer,
                    campaigns_id integer,
                    weeks_week integer,
                    wage integer,
                    PRIMARY KEY (companies_id, campaigns_id, weeks_week),
                    FOREIGN KEY (campaigns_id) REFERENCES campaigns(id),
                    FOREIGN KEY (companies_id) REFERENCES companies(id),
                    FOREIGN KEY (weeks_week) REFERENCES weeks(week)
                )`

        const event_cards =
            `CREATE TABLE IF NOT EXISTS event_cards (
                    id integer PRIMARY KEY,
                    description text,
                    event_types_id integer,
                    event_data BLOB,
                    companies_id integer,
                    FOREIGN KEY (companies_id) REFERENCES companies(id)
                )`

        const event_types =
            `CREATE TABLE IF NOT EXISTS event_types (
                    id integer PRIMARY KEY,
                    description text
                )`

        const fixed_event_cards =
            `CREATE TABLE IF NOT EXISTS fixed_event_cards (
                    id integer PRIMARY KEY,
                    description text,
                    event_types_id integer,
                    event_data BLOB,
                    weeks_week integer,
                    companies_id integer,
                    FOREIGN KEY (companies_id) REFERENCES companies(id),
                    FOREIGN KEY (weeks_week) REFERENCES weeks(week)
                )`

        const event_card_history =
            `CREATE TABLE IF NOT EXISTS event_card_history (
                    weeks_week integer PRIMARY_KEY,
                    event_cards_id integer,
                    FOREIGN KEY (event_cards_id) REFERENCES event_cards(id)
                )`

        const user_career_history =
            `CREATE TABLE IF NOT EXISTS user_career_history (
                    accounts_username text,
                    companies_id integer,
                    weeks_week integer,
                    is_supervisor binary,
                    PRIMARY KEY (accounts_username, companies_id, weeks_week),
                    FOREIGN KEY (accounts_username) REFERENCES accounts(username) ON DELETE CASCADE ON UPDATE CASCADE,
                    FOREIGN KEY (companies_id) REFERENCES companies(id),
                    FOREIGN KEY (weeks_week) REFERENCES weeks(week)
                )`

        const user_total_company_hours = 
                `CREATE TABLE IF NOT EXISTS user_total_company_hours (
                    accounts_username text,
                    companies_id integer,
                    total_hours integer,
                    PRIMARY KEY (accounts_username, companies_id),
                    FOREIGN KEY (accounts_username) REFERENCES accounts(username) ON DELETE CASCADE ON UPDATE CASCADE,
                    FOREIGN KEY (companies_id) REFERENCES companies(id),
                )`


        Promise.all([
                db.run(campaigns),
                db.run(accounts),
                db.run(companies),
                db.run(weeks),
                db.run(user_game_selections),
                db.run(user_game_weeks),
                db.run(user_profit_weeks),
                db.run(weekly_excluded_companies),
                db.run(event_cards),
                db.run(event_types),
                db.run(fixed_event_cards),
                db.run(user_career_history),
                db.run(event_card_history),
                db.run(company_wage_history),
                db.run(user_strike_weeks),
                db.run(user_total_company_hours)
            ])
            .then(() => resolve())
            .catch((reject) => {
                reject()
                console.log("Error when building table: " + reject)
            })
    })


}

function insertCompanies(company = Company) {
    return db.run(
        `INSERT INTO 
            companies (name, brain, muscle, heart, starting_wage, regular_hours, supervisor_hours) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [company.name, company.brain, company.muscle, company.heart, company.starting_wage, company.regular_hours, company.supervisor_hours])
}

function insertCompanyWageHistory(companies_id, campaigns_id, weeks_week, wage) {
    return db.run("INSERT into company_wage_history VALUES(?, ?, ?, ?)", [companies_id, campaigns_id, weeks_week, wage])
}

function insertWeeks(companyName) {
    return db.run(`INSERT INTO weeks VALUES (?)`, [companyName])
}

// function insertAccounts(username, password, salt, isAdmin, campaigns_id) {
//     return db.run('INSERT INTO accounts VALUES (?, ?, ?, ?, ?)', [username, password, salt, isAdmin, campaigns_id])
// }

// function insertStudentGameWeeks(username, week, isSubmitted, available_brain, available_muscle, available_heart, total_profit, last_week_profit) {
//     return db.run(`INSERT INTO user_game_weeks VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [username, week, isSubmitted, available_brain, available_muscle, available_heart, total_profit, last_week_profit])
// }

// function insertUserSelections(username, company_name, weeks_week, hours, strike) {
//     return db.run('INSERT INTO user_game_selections VALUES (?, ?, ?, ?, ?)', [username, company_name, weeks_week, hours, strike])
// }

// function insertCompanySessions(company_name, weeks_week, campaign_id, brain, muscle, heart) {
//     return db.run('INSERT INTO company_sessions VALUES(?, ?, ?, ?, ?, ?)', [company_name, weeks_week, campaign_id, brain, muscle, heart])
// }

// function insertUserProfitWeeks(username, week, weekProfit, totalProfit) {
//     return db.run('INSERT INTO user_profit_weeks VALUES(?, ?, ?, ?)', [username, week, weekProfit, totalProfit]) 
// }

function insertEventCards(description, event_types_id, event_data, companies_id) {
    return db.run('INSERT INTO event_cards (description, event_types_id, event_data, companies_id) VALUES(?, ?, ?, ?)', [description, event_types_id, event_data, companies_id])
}

function insertEventTypes(description) {
    return db.run('INSERT INTO event_types (description) VALUES(?)', [description])
}

function insertFixedEventCards(description, event_types_id, event_data, weeks_week, companies_id) {
    return db.run('INSERT INTO fixed_event_cards (description, event_types_id, event_data, weeks_week, companies_id) VALUES (?, ?, ?, ?, ?)', [description, event_types_id, event_data, weeks_week, companies_id])
}

// function insertUserCareerHistory(accounts_username, companies_id, weeks_week, is_supervisor) {
//     return db.run('INSERT INTO user_career_history VALUES(?, ?, ?, ?)', [accounts_username, companies_id, weeks_week, is_supervisor])
// }

function insertWeeklyExcludedCompanies(weeks_week, companies_id) {
    return db.run('INSERT INTO weekly_excluded_companies VALUES (?, ?)', [weeks_week, companies_id])
}

function insertCampaigns(campaign_name) {
    return db.run(`INSERT INTO campaigns (name) VALUES (?)`, [campaign_name])
}

function insertInitialWages(campaigns_id, weeks_week) {
    return db.run(`INSERT INTO 
                company_wage_history  (companies_id, campaigns_id, weeks_week, wage) 
            SELECT 
                id, ?, ?, starting_wage 
            FROM companies;`, [campaigns_id, weeks_week])
}

class Company {
    constructor(name, brain, muscle, heart, starting_wage, regular_hours, supervisor_hours) {
        this.name = name
        this.brain = brain
        this.muscle = muscle
        this.heart = heart
        this.starting_wage = starting_wage
        this.regular_hours = regular_hours
        this.supervisor_hours = supervisor_hours
    }
}

const campaigns = ["UTM", "SFU", "Test"]
const totalGameWeeks = 12
const allCompanies = [
    new Company('Poopora', 1, 3, 2, 15, 45, 90), // 1
    new Company('Cam with Benefits', 1, 2, 5, 20, 30, 60), // 2
    new Company('Cheesewagon', 2, 0, 2, 10, 50, 120), // 3
    new Company('Dim\'s Convenience', 1, 4, 1, 15, 30, 80), // 4
    new Company('Flag that D', 1, 0, 1, 5, 80, 250),
    new Company('High Sugar', 0, 3, 1, 10, 40, 100), // 6
    new Company('Robo A+', 3, 0, 1, 10, 50, 100),
    new Company('Skip the Pusher', 1, 3, 0, 10, 40, 100), // 8
    new Company('SofaCrash', 1, 1, 2, 10, 75, 150),
    new Company('Code Monkey', 2, 0, 6, 20, 30, 50), // 10
    new Company('Friend.ly', 1, 0, 3, 10, 50, 100),
    new Company('Trashpanda', 1, 3, 0, 10, 40, 100), // 12
    new Company('MEDITATION', 0, 0, 2, null, null, null), // 13
    new Company('GYM', 0, 2, 0, null, null, null),
    new Company('TUTORIAL', 2, 0, 0, null, null, null) // 15
]
const trainingCompanies = ['MEDITATION', 'GYM', 'TUTORIAL']
const initialExcludedCompanies = ['Trashpanda', 'Friend.ly']

function insertMockData() {

    const allInserts = []

    // Insert into table: campaigns
    const campaignInserts = campaigns.map((data) => {
        return insertCampaigns(data)
    })
    allInserts.concat(campaignInserts)
    
    // Insert into table: weeks
    const gameWeeks =[]
    for(let w = 1; w <= totalGameWeeks; w++) {
        gameWeeks.push(insertWeeks(w))
    }
    allInserts.concat(gameWeeks)

    // Insert into table: companies
    const allCompanyInserts = allCompanies.map((company) => {
        return insertCompanies(company)
    })
    allInserts.concat(allCompanyInserts)

    // Insert into table: weekly_excluded_companies
    const excludedCompanyInserts = []
    initialExcludedCompanies.forEach((name) => {
        for(let i = 0; i < allCompanies.length; i++) {
            const company = allCompanies[i]
            if(name == company.name) {
                for(let w = 1; w <= totalGameWeeks; w++) {
                    excludedCompanyInserts.push(insertWeeklyExcludedCompanies(w, i+1))
                }
                break;
            } 
        }
    })
    allInserts.concat(excludedCompanyInserts)

    // Insert into table: company_wage_history (initial week 1 wages)
    const wageHistoryInserts = []
    allCompanies.forEach((company, i) => {
        const companyID = i+1
        const startingWage = company.starting_wage
        const week = 1
        if(trainingCompanies.includes(company.name) === false) {
            campaigns.forEach((name, i2) => {
                const campaignID = i2+1
                wageHistoryInserts.push(insertCompanyWageHistory(companyID, campaignID, 1, startingWage))
            })
        }
        
    })
    allInserts.concat(wageHistoryInserts)

    const eventInsertions = [
        // Event Types
        insertEventTypes("Percentage Multiplier"), // 1
        insertEventTypes("Out of Business"), // 2
        //Event Cards
        insertEventCards("An epidemic of viral gastroenteritis has hit dogs across town. Poopora has got nothing to do with this, but dog owners are blaming Poopers for their beloved pup’s vomit. All Poopers get downrated and lose their weekly pay.", 1, 0, 1),
        insertEventCards("Hackers have breached into CWB’s database and outed all Cammers (and customers) by publishing their names and addresses. If you are working for CWB this week your income drops 20% as some customers move to a 'more secure' camming sites.", 1, 0.2, 2),
        insertEventCards("Canadian universities implement new anti-plagiarism software that can detect Robo A+ essays. The company’s customers are lined up in front of the Dean’s office and won’t pay their bills this week.", 1, 0, 7),
        insertEventCards("Construction work! The new mayor is dismantling all bike lanes, Skip the Pusher workers have to slow down and deliver 20% fewer orders per hour.", 1, -0.2, 8),
        insertEventCards("Too many dxxxs! An abrupt spike in unsolicited dxxx picks on WhutsUpp is just too much for Ds to take. If you were working for Flag That D this week, you need to take a break and lose your wage (but keep working for other companies).", 1, 0, 5),
        insertEventCards("Code Monkey signs a big contract with Boogle to write new software which will be used to make decisions on behalf of Toronto and Vancouver’s city councils. Monkeys receive a +20% bump.", 1, 0.2, 10),
        insertEventCards("The City introduces new regulation to curb illegal hotels and rentals. SofaCrashers need to be careful and reduce their customers. This decreases their income by 20%.", 1, -0.2, 9),
        insertEventCards("It’s a tough job market. Precarity and unpredictable wages increase the need for emotional support, which bumps Friend.ly customers by 20%.", 1, 0.2, 11),
        insertEventCards("Following a hype that made everyone enroll in Computer Science four years ago, the market is flooded by new programmers. Code Monkey reduces its pay by 20%.", 1, -0.2, 10),
        insertEventCards("The new federal government changed the definition of inappropriate content. Now social media platforms need to filter out pretty much any exposed body part. Flag that D increases its wages by 20% to attract more workers.", 1, 0.2, 5),
        insertEventCards("Teachers’ strike! All class trips are cancelled, and WCs (Cheesewagon) lose their side gigs (-20%).", 1, -0.2, 3),
        insertEventCards("Thanks to a miraculous series of events, student debt is cancelled. University students across the province are happy and Friend.ly loses a sizeable chunk of its customers. Friends make 20% less than usual. ", 1, -0.2, 11),
        insertEventCards("A whistleblower leaks thousands of conversations from Friend.ly. The company promised they were not recording chats, but it looks like customer data was just too valuable. Friend.ly goes offline forever in order to focus on the ensuing lawsuit.", 2, null, 11),
        insertEventCards("The province has changed its policy for pot commerce. From now on, only a newly formed company owned by the Premier’s family can operate home delivery apps. Skip the Pusher disconnects all its workers and moves to P.E.I. ", 2, null, 8),
        insertEventCards("SofaCrash investors realize it has been a scam since day one: all profits were diverted to a tax haven in Barbados. They pull all their money and the company folds. ", 2, null, 9),
        insertEventCards("Elon Musk’s self-made nephew and genius startupper rethinks his career ambitions. He closes Code Monkey and reinvests the money in an “Ontario Poutine” food truck chain he plans to open in Quebec. ", 2, null, 10),
        insertEventCards("Hungry for a job and building upon their experience with the Queen’s Royal Corgis, Meghan and Harry launch a new luxury dog walking service. Poopora loses its client base and goes bankrupt. ", 2, null, 1),
        insertEventCards("Bay Street Angel investors who funded High Sugar never actually believed that such a niche company would succeed. They manage to unload junk shares on people’s saving accounts before it goes bankrupt.", 2, null, 6),
        insertEventCards("Online sex experiences a major market concentration. Most websites are absorbed by Montreal giant DirtHub, including Cam with Benefits. The service is taken offline.", 2, null, 2),
        insertEventCards("The City runs out of money and cuts its recycling and composting programs. Garbage sorting goes back to being so easy that TrashPanda loses most of its revenues. It immediately files for bankruptcy.", 2, null, 12),
        insertEventCards("Robo A+ purchases MyBrainOnBubbleTea, a new machine learning start-up that has automated essay writing. All jobs are taken offline. On Peddit, anonymous students report that their grades have gone up.", 2, null, 7),
        insertEventCards("Berlin is here! The subway starts running 24/7 and CheeseWagon’s cashflow dips. The company folds immediately and sells all its school buses to Scouts Canada.", 2, null, 3),
        insertEventCards("Justin Trudeau reveals that his dog Kenzie loves being walked by Poopers. The hype boosts work for the app, which raises its wages by 20%.", 1, 0.2, 1),
        insertEventCards("New city bylaw: the city adds four new types of garbage bins. So difficult! People hire more Pandas to sort their waste, and the pay goes up by 20%.", 1, 0.2, 12),
        insertEventCards("A major snowstorm locks everyone at home for the entire weekend. There is nothing else to do but to order more pot from Skip the Pusher. Pushers risk their lives on the slippery roads but make an extra 20%.", 1, 0.2, 8),
        insertEventCards("Dim’s introduces new robots in its warehouses. Each can pack one hundred potato chips bags per minute. There are no layoffs, but DimBits’ wages are 20% lower than usual.", 1, -0.2, 4),
        // Fixed Event Cards
        insertFixedEventCards("Black Tuesday! Sales are hot today. Dim’s has a special offer with new potato chip flavours and discounted cigarettes. Pay goes up 20% for all DimBits.", 1, 0.2, 3, 4),
        insertFixedEventCards("Valentine’s Day is coming up. Lovers order tons of heart-shaped donuts from High Sugar, and pay goes up 20%.", 1, 0.2, 4, 6),
        insertFixedEventCards("Singles buy lots of love from CWB and Cammers’ pay goes up 20%.", 1, 0.2, 4, 2),
        insertFixedEventCards("Most mid-term essays are due this week. Robo A+ has a spike in orders and pays 20% more.", 1, 0.2, 6, 7),
        insertFixedEventCards("Long weekend: everyone is out of town, taking their garbage with them. TrashPanda cuts work by 20%.", 1, -0.2, 8, 12),
        insertFixedEventCards("St. Patrick’s Day. Party time for the Irish, and someone has to drive them around all night. Cheesewagon pays 20% more.", 1, 0.2, 9, 3)
    ]
    allInserts.concat(eventInsertions)

    return new Promise((resolve, reject) => {
        Promise.all(allInserts).then(() => resolve())
    })


}
db.startDB()
    .then(() => {
        return createTables()
    })
    .then(() => {
        return insertMockData()
    })
    .then(() => db.close())