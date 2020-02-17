import React, { Component } from 'react'
import { Box, Select, Typography, MenuItem, Button } from '@material-ui/core'
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

class AdminResults extends Component {
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

    logout() {
        fetch('/api/logout', { method: "POST" }).then(() => {this.props.history.push('/login')}).catch(() => { console.log("Couldn't log out") })
      }



    render() {
        if (!this.state.isLoaded) {
            return (<div></div>)
        }

        let fixedEventCard = []
        this.state.fixedEvents.forEach(fe => {
            fixedEventCard.push(<Typography>{fe.description}</Typography>)
            fixedEventCard.push(<br></br>)
        });
        let eventCard = this.state.eventCard.description

        let strikeEvents = []

        let careerEvents = []
        this.state.careerEvents.forEach(event => {
            const username = event.accounts_username
            const company = event.company_name
            const position = event.supervisor === 0 ? "Regular" : "Supervisor"
            careerEvents.push(<Typography>{username + " promoted to " + position + " at " + company}</Typography>)
            careerEvents.push(<br></br>)
        })

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
                
                <div>
                    <Button variant="contained" onClick={() => { this.logout() }}>Logout</Button>
                </div>
                
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
                    {fixedEventCard}
                </Box>
                <Box>
                    <Typography variant="h5">Event Card</Typography>
                    <Typography>{eventCard}</Typography>
                    <br></br>
                </Box>
                <Box>
                    <Typography variant="h5">Strike Events</Typography>

                    <br></br>
                </Box>
                <Box>
                    <Typography variant="h5">Career Events</Typography>
                    <Typography>{careerEvents}</Typography>
                    <br></br>
                </Box>

                <div className="container">
                    <div className="row">


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
                    </div>
                </div>

            </Box>
        )
    }
}

export default styles(AdminResults)