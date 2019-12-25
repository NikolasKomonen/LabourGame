const SQL = require('../database/sqliteIndex')

const getCompanies = (req, res = Response, db = SQL, week) => {
    
    db.all(`SELECT companies_name, brain, muscle, heart FROM game_sessions WHERE weeks_week=?`, [week]).then((rows) => {
        res.status(200)
        res.send({ sessions:rows, week: week})
    })
}

exports.getCompanies = getCompanies;

// app.get('/NikolasKomonen/Game', (req, res) => {
//     res.status(200)
    
//     res.send({data: getCompanies()});
// })