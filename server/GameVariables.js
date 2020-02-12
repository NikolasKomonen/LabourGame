class GameVariables{
    constructor(week) {
        this.week = week
    }

    getWeek() {
        return this.week
    }

    getGivenWeek(req = Request) {
        return req.body.week == null ? this.week : req.body.week;
    }

    getGivenOrPreviousWeek(req = Request) {
        return req.body.week == null ? this.week-1 : req.body.week;
    }

}

module.exports = GameVariables