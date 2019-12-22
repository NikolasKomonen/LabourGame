

const getCompanies = () => {
    var x = []

    for (let i = 0; i < 10; i++) {
        x[i] = {name: "Company"+i, brain: 0, muscle: i+1, heart: i+2}
    }

    return x;
}

exports.getCompanies = getCompanies;

// app.get('/NikolasKomonen/Game', (req, res) => {
//     res.status(200)
    
//     res.send({data: getCompanies()});
// })