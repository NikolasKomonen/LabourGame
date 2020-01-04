import React, { Children } from 'react'
import Typography from '@material-ui/core/Typography'
import { Box, Button, withStyles, ButtonGroup, } from '@material-ui/core';
import GameRow from './GameRow'
import GameTotals from './GameTotals'
import indigo from '@material-ui/core/colors/indigo'

export const HOURS_ID = 'game-hours-'
export const BRAIN_ID = 'game-brain-'
export const MUSCLE_ID = 'game-muscle-'
export const HEART_ID = 'game-heart-'
export const STRIKE_ID = 'game-strike-'

const styles = withStyles({
    availablePointsContainer: {
        background: indigo[500],
        position: 'sticky',
        top: 65,
        color: 'black',
        paddingTop: '40px',
        paddingBottom: '40px',
        zIndex: 5,
    },
    columnHeaders: {

        position: 'sticky',
        top: 155,
        background: 'white',
        paddingTop: '40px',
        paddingBottom: '40px',
        zIndex: 5,
    },
    availablePointsButtons: {
        border: 'solid white 1px',
        color: 'white',
    }
});

class GameForm extends React.Component {

    constructor() {
        super();
        this.state = {
            isLoaded: false,
            companies: [],
            saveStatus: "Last Saved " + new Date().toLocaleTimeString(),
            disableAll: false,
            week: 0,
            totalEarnings: 12345,
            previousWeekEarnings: 999
        }
        this.timer = undefined
        // stack to determine set the saved status only after the most recent request is successful
        // incremented in GameRow
        this.selectionStack = 0;
    }

    componentDidMount() {
        fetch('/api/getGameFormData')
            .then(res => {
                return res.json();
            }).then(data => {
                const tempState = { ...this.state }
                const len = data.rows.length
                tempState.companies = data.rows
                tempState.wasSubmitted = data.submitted
                tempState.week = data.week
                tempState.isLoaded = true
                tempState.numRows = len
                tempState.username = data.username
                this.setState(tempState)
                console.log("Set the state in did mount")
            }, (error) => {
                console.log("Error fetching companies: " + error)
            }).then(() => {
                console.log("Children: ", Children.count(this.props.children))
            })
    }

    sendSelection(change) {
        const data = {
            update: change, // {companies_name: ... , hours: ... , strike: ...}
            week: this.state.week,
        }
        fetch('/api/sendSelection', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            }
        }).then((res) => {
            this.selectionStack--
            const status = res.status
            if (status === 200 && this.selectionStack === 0) {
                const newState = { ...this.state }
                newState.saveStatus = "Last Saved " + new Date().toLocaleTimeString();
                this.setState(newState)
                return;
            }
        })

    }

    setNotSaved() {
        if (this.state.saveStatus !== "Not Saved") {
            const newState = { ...this.state }
            newState.saveStatus = "Not Saved";
            this.setState(newState)
        }
    }


    render() {
        const { error, isLoaded } = this.state;
        if (error) {
            return <div>Error {error.message}</div>
        }
        if (!isLoaded) {
            return <div>Loading...</div>
        }
        return (
            <Box>

                <Box className="col-12 border-bottom" pb={4}>
                    <Box className="row">
                        <Box className="col-md-4 col-12">
                            <Typography className="col-12" variant="h2" id="game-form-week" noWrap>
                                Week {this.state.week}
                            </Typography>
                            <Box className="col-12" mt={2}>
                                <Typography variant="h6" id="game-form-name">
                                    User: <small>{this.state.username}</small>
                                </Typography>
                            </Box>

                        </Box>
                        <Box className="col-md-4 col-12" display="flex" alignItems="flex-end">
                            <Box>
                            <Box className="col-12" >
                                <Typography variant="h6" id="game-saved-status" >
                                    Previous week: <small>${this.state.previousWeekEarnings}</small>
                                </Typography>
                            </Box>
                            <Box className="col-12 " >
                                <Typography variant="h6" id="game-saved-status">
                                    Total Earnings: <small>${this.state.totalEarnings}</small>
                                </Typography>
                            </Box>
                            </Box>
                        </Box>
                        <Box className="col-md-4 col-12" pr={0} display="flex" justifyContent="center">
                            <Box mt="auto" className="col-6" pt={3} pr={0} >
                                <Typography id="game-saved-status">
                                    {this.state.saveStatus}
                                </Typography>
                            </Box>

                            <Box mt="auto" className="col-6"  display="flex" justifyContent="flex-end" pr={0} >
                                <Button id="game-submit-button" variant="contained" color="primary" disabled={this.disableAll}>Submit</Button>
                            </Box>
                        </Box>
                    </Box>
                </Box>

                <Box className={this.props.classes.availablePointsContainer + " col-12 mt-3 py-3"} borderRadius={5}>
                    <Box className="row">
                    <Box className="col-md-5 my-auto" style={{color:'white'}}display="flex" justifyContent="center">
                        Available Points
                    </Box>
                    <Box className="col-md-6 p-0" display="flex">
                        <Box className="col-4" display="flex" justifyContent="center">

                            <ButtonGroup size="large" aria-label="small outlined button group">
                                <Button hidden={this.state.week !== 1} className={this.props.classes.availablePointsButtons}>-</Button>
                                <Button disabled style={{ color: "white", border: 'solid white 1px' }}>2</Button>
                                <Button hidden={this.state.week !== 1} className={this.props.classes.availablePointsButtons}>+</Button>

                            </ButtonGroup>
                        </Box>
                        <Box className="col-4" display="flex" justifyContent="center">

                            <ButtonGroup size="large" aria-label="small outlined button group">
                                <Button hidden={this.state.week !== 1} className={this.props.classes.availablePointsButtons}>-</Button>
                                <Button disabled style={{ color: "white", border: 'solid white 1px' }}>2</Button>
                                <Button hidden={this.state.week !== 1} className={this.props.classes.availablePointsButtons}>+</Button>

                            </ButtonGroup>
                        </Box>
                        <Box className="col-4" display="flex" justifyContent="center">

                            <ButtonGroup size="large" aria-label="small outlined button group">
                                <Button hidden={this.state.week !== 1} className={this.props.classes.availablePointsButtons}>-</Button>
                                <Button disabled style={{ color: "white", border: 'solid white 1px' }}>2</Button>
                                <Button hidden={this.state.week !== 1} className={this.props.classes.availablePointsButtons}>+</Button>

                            </ButtonGroup>
                        </Box>
                    </Box>
                    </Box>

                </Box>
                <Box className={this.props.classes.columnHeaders + " col-12 mt-3 py-2 pr-3"} borderTop={2} borderBottom={2}>
                    <Box className="row">
                        <Box className="col-md-2 col-12" display="flex">
                            <Box className="mx-auto p-1" fontWeight="fontWeightBold" fontSize={26}>
                                Company
                        </Box>
                        </Box>
                        <Box className="col-md-3 col-4" display="flex">
                            <Box className="mx-auto p-1" fontWeight="fontWeightBold" fontSize={26}>
                                Hours
                        </Box>
                        </Box>
                        <Box className="col-md-6 col-8 p-0 py-md-0 py-3" display="flex">
                            <Box className="col-4" display="flex">
                                <Box className="mx-auto my-auto" fontWeight="fontWeightMedium" fontSize={18}>
                                    Brain
                            </Box>
                            </Box>
                            <Box className="col-4" display="flex">
                                <Box className="mx-auto my-auto" fontWeight="fontWeightMedium" fontSize={18}>
                                    Muscle
                            </Box>
                            </Box>
                            <Box className="col-4" display="flex">
                                <Box className="mx-auto my-auto" fontWeight="fontWeightMedium" fontSize={18}>
                                    Heart
                            </Box>
                            </Box>
                        </Box>
                        <Box className="col-md-1 col-12" display="flex">
                            <Box className="mx-auto p-1" fontWeight="fontWeightBold" fontSize={26}>
                                Strike
                        </Box>
                        </Box>
                    </Box>
                </Box>
                {this.state.companies.map((c, i) => {
                    return (
                        <GameRow key={i} company={c} index={i} parent={this} />
                    );
                })}
                <GameTotals />

            </Box>
        );
    }
}

export default styles(GameForm)