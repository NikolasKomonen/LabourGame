import React, { Component } from 'react'
import { Box, Select, Typography, MenuItem } from '@material-ui/core'
import { withStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';

const styles = withStyles({
    table: {
        minWidth: 650,
    },
    leaderboard: {
        minWidth: 400,
        maxWidth: 500,
        marginLeft: 'auto',
        marginRight: 'auto',

    },
    headRow: {
        backgroundColor: "black",
        color: "white",
    },
    headText: {
        color: "white",
        size: "15px"
    },
    boldData: {
        fontSize: "18px",

        fontWeight: "bolder"
    }
});

class ResultsSection extends Component {
    constructor() {
        super()
        this.state = {
            isLoaded: false,
            userRows: [],
            leaderboardWeek: [],
            leaderboardAll: [],
            username: "",
            latestResultsWeek: 0,
            currentResultsWeek: 0,
            userWeekSelection: 0
        }

    }

    componentDidMount() {
        this.fetchResults(null)
    }

    fetchResults(week) {
        fetch('/api/getResults', {
            method: 'POST', // or 'PUT'
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ week: week }),
        })
            .then(res => {
                return res.json();
            }).then(data => {
                console.log(data)
                const tempState = {}
                tempState.userRows = data.userRows
                tempState.currentResultsWeek = data.week
                tempState.latestResultsWeek = data.latestResultsWeek
                tempState.userWeekSelection = data.week
                tempState.leaderboardWeek = data.leaderboardWeek
                tempState.leaderboardAll = data.leaderboardAll
                tempState.isLoaded = true
                tempState.username = data.username
                tempState.fixedEvents = data.gameEvents[0]
                tempState.eventCard = data.gameEvents[1]
                tempState.strikeEvents = data.gameEvents[2]
                tempState.careerEvents = data.gameEvents[3]
                tempState.nextWeekResources = data.resources
                this.setState(tempState)
            }, (error) => {
                console.log("Error fetching companies: " + error)
            })
    }

    changeCurrentWeek(week) {
        this.fetchResults(week)
    }



    render() {
        if (!this.state.isLoaded) {
            return (<div></div>)
        }

        let fixedEventCards = []
        this.state.fixedEvents.forEach((fe, i) => {
            fixedEventCards.push(<Typography key={i}>{fe.description}</Typography>)
            fixedEventCards.push(<br key={i + "br"}></br>)
        });

        if(fixedEventCards.length < 1) {
            fixedEventCards = [<Box>None</Box>]
        }

        let eventCard = this.state.eventCard.description

        let strikeEvents = []
        this.state.strikeEvents.forEach(event => {
            const companyName = event.name
            const workersStriked = event.workers_striked
            const total_workers = event.total_workers
            strikeEvents.push(<Typography>There was a strike at {companyName} with {workersStriked} out of {total_workers} going on strike.</Typography>)
        })

        if(strikeEvents.length < 1) {
            strikeEvents = [<Box>None</Box>]
        }

        let careerEvents = []
        this.state.careerEvents.forEach((event, i) => {
            const username = event.accounts_username
            const company = event.company_name
            const position = event.is_supervisor === 0 ? "Regular" : "Supervisor"
            careerEvents.push(<Typography key={username + company} component={'span'}>{username + " promoted to "} <Box component='span' fontWeight="fontWeightBold">{position}</Box> {" at " + company}</Typography>)
            careerEvents.push(<br key={i}></br>)
        })

        if(careerEvents.length < 1) {
            careerEvents = [<Box>None</Box>]
        }

        let nextWeekResources = []
        nextWeekResources.push(<Typography className="pl-5" variant="h6">Brain <small>{this.state.nextWeekResources.available_brain}</small></Typography>)
        nextWeekResources.push(<Typography className="pl-5" variant="h6">Muscle <small>{this.state.nextWeekResources.available_muscle}</small></Typography>)
        nextWeekResources.push(<Typography className="pl-5" variant="h6">Heart <small>{this.state.nextWeekResources.available_heart}</small></Typography>)

        const gameIDOptions = []
        for (let i = this.state.latestResultsWeek; i > 0; i--) {
            let value = i
            let currentWeek = i
            if (this.state.currentResultsWeek !== value) {
                gameIDOptions.push(<MenuItem key={currentWeek} value={value}>Week {currentWeek}</MenuItem>)
            }
        }

        return (
            <Box>
                <Box>
                    <Typography variant="h2">Week {this.state.currentResultsWeek} Results</Typography>
                </Box>
                <Select
                    id="game-id-selection"
                    className="col-2"
                    value={this.state.selectedGameWeek}

                    onChange={(e) => { this.changeCurrentWeek(e.target.value) }}
                >
                    {gameIDOptions}
                </Select>
                <Box>
                    <Typography variant="h5">Fixed Events</Typography>
                    <Typography>{fixedEventCards}</Typography>
                </Box>
                <Box>
                    <Typography variant="h5">Event Card</Typography>
                    <Typography>{eventCard}</Typography>
                    <br></br>
                </Box>
                <Box>
                    <Typography variant="h5">Strike Events</Typography>
                    <Typography>{strikeEvents}</Typography>
                    <br></br>
                </Box>
                <Box>
                    <Typography variant="h5">Career Events</Typography>
                    <Typography>{careerEvents}</Typography>
                    <br></br>
                </Box>

                <Box>
                    <Typography variant="h5">Next Week Resources</Typography>
                    {nextWeekResources}
                </Box>
                <Typography align="center" variant="h4">Week {this.state.currentResultsWeek} Wages</Typography>
                <TableContainer component={Paper}>
                    <Table className={this.props.classes.table} size="medium" style={{ tableLayout: "fixed" }} aria-label="a dense table">
                        <TableHead>
                            <TableRow className={this.props.classes.headRow}>
                                <TableCell className={this.props.classes.headText} align="right">Company</TableCell>
                                <TableCell className={this.props.classes.headText} align="right">Wage(Modifier)</TableCell>
                                <TableCell className={this.props.classes.headText} align="right">Hours Worked</TableCell>
                                <TableCell className={this.props.classes.headText} align="right">Pay</TableCell>
                                <TableCell className={this.props.classes.headText} align="right">Total Hours Worked</TableCell>
                                <TableCell className={this.props.classes.headText} align="right">Career</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {this.state.userRows.map(row => {

                                return (
                                    <TableRow key={row.name}>

                                        <TableCell align="right" color="white">{row.name}</TableCell>
                                        <TableCell align="right">${row.wage}</TableCell>
                                        <TableCell className={row.hours > 0 ? this.props.classes.boldData : ""} align="right">{row.hours} Hrs</TableCell>
                                        <TableCell className={row.hours > 0 ? this.props.classes.boldData : ""} align="right">${row.pay}</TableCell>
                                        <TableCell align="right">{row.total_hours} Hrs</TableCell>
                                        <TableCell align="right">{row.career}</TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>


                <div className="container">
                    <div className="row">

                        <Box className={this.props.classes.leaderboard + " col-6"} mt={5}>
                            <Typography align="center" variant="h4">Week {this.state.currentResultsWeek} Profit</Typography>
                            <Table className={this.props.classes.leaderboard + " col-6"} size="small" style={{ tableLayout: "revert" }} aria-label="a dense table">
                                <TableHead>
                                    <TableRow className={this.props.classes.headRow}>

                                        <TableCell className={this.props.classes.headText} align="left">User</TableCell>
                                        <TableCell className={this.props.classes.headText} align="right">Total Week Profit</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {this.state.leaderboardWeek.map(row => {

                                        return (
                                            <TableRow key={row.username}>

                                                <TableCell align="left" color="white" className={row.username === this.state.username ? this.props.classes.boldData : ""}>{row.username}</TableCell>
                                                <TableCell align="right" className={row.username === this.state.username ? this.props.classes.boldData : ""}>${row.week_profit}</TableCell>

                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </Box>
                        <Box className={this.props.classes.leaderboard + " col-6"} mt={5}>
                            <Typography align="center" variant="h4">Total Profit</Typography>
                            <Table className={this.props.classes.leaderboard + " col-6"} size="small" style={{ tableLayout: "revert" }} aria-label="a dense table">
                                <TableHead>
                                    <TableRow className={this.props.classes.headRow}>

                                        <TableCell className={this.props.classes.headText} align="left">User</TableCell>
                                        <TableCell className={this.props.classes.headText} align="right">All-Time Profit</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {this.state.leaderboardAll.map(row => {

                                        return (
                                            <TableRow key={row.username}>

                                                <TableCell align="left" color="white" className={row.username === this.state.username ? this.props.classes.boldData : ""}>{row.username}</TableCell>
                                                <TableCell align="right" className={row.username === this.state.username ? this.props.classes.boldData : ""}>${row.total_profit}</TableCell>

                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </Box>
                    </div>
                </div>

            </Box>
        )
    }
}

export default styles(ResultsSection)