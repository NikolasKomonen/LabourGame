import React, { Component } from 'react'
import { Box } from '@material-ui/core'
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
            username: ""
        }

    }

    componentDidMount() {
        fetch('/api/getResults', {
            method: 'GET', // or 'PUT'
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(),
        })
            .then(res => {
                return res.json();
            }).then(data => {
                console.log(data)
                const tempState = {}
                tempState.userRows = data.userRows
                tempState.leaderboardWeek = data.leaderboardWeek
                tempState.leaderboardAll = data.leaderboardAll
                tempState.isLoaded = true
                tempState.username = data.username
                this.setState(tempState)
            }, (error) => {
                console.log("Error fetching companies: " + error)
            })
    }

    render() {
        if (!this.state.isLoaded) {
            return (<div></div>)
        }
        return (
            <Box>
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

                    
                    <Table className={this.props.classes.leaderboard + " col-6"}  size="small" style={{ tableLayout: "revert" }} aria-label="a dense table">
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

                                        <TableCell align="left" color="white" className={row.username === this.state.username? this.props.classes.boldData : ""}>{row.username}</TableCell>
                                        <TableCell align="right" className={row.username === this.state.username? this.props.classes.boldData : ""}>${row.week_profit}</TableCell>

                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                    <Table className={this.props.classes.leaderboard + " col-6"}  size="small" style={{ tableLayout: "revert" }} aria-label="a dense table">
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

                                        <TableCell align="left" color="white" className={row.username === this.state.username? this.props.classes.boldData : ""}>{row.username}</TableCell>
                                        <TableCell align="right" className={row.username === this.state.username? this.props.classes.boldData : ""}>${row.total_profit}</TableCell>

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

export default styles(ResultsSection)