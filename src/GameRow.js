import React from 'react'
import Typography from '@material-ui/core/Typography'
import { Box, TextField, FormControl, FormControlLabel, FormGroup, Checkbox, InputAdornment } from '@material-ui/core';
import { BRAIN_ID, MUSCLE_ID, HEART_ID, STRIKE_ID } from './GameForm'

export default class GameRow extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            hours: 0,
            strikeEnabled: false,
            strike: false,
            brain: 0,
            muscle: 0,
            heart: 0,
        }
    }

    onChangedHours(hoursEntered) {
        const parsedInt = parseInt(hoursEntered)
        if (!isNaN(parsedInt) && hoursEntered >= 0) {
            const newState = {
                hours: hoursEntered,
                strikeEnabled: (parsedInt > 0) ? true : false,
                strike: this.state.strike,
                brain: (this.props.company.brain * hoursEntered),
                muscle: (this.props.company.muscle * hoursEntered),
                heart: (this.props.company.heart * hoursEntered)
            }
            this.setState(newState, () => {
                this.props.parent.sendSelection(this.getUpdatedSelection())
            })
            return;
        }
        else if (hoursEntered === undefined || hoursEntered === null || hoursEntered.length === 0) {
            const newState = {
                hours: undefined,
                strikeEnabled: false,
                strike: this.state.strike,
                brain: 0,
                muscle: 0,
                heart: 0
            }
            this.setState(newState, () => {
                this.props.parent.sendSelection(this.getUpdatedSelection())
            })
            return;
        }

    }

    onToggleStrike(checked) {
        const newState = { ...this.state }
        newState.strike = checked
        this.setState(newState, () => {
            this.props.parent.sendSelection(this.getUpdatedSelection())
        })

    }

    getUpdatedSelection() {
        const hours = this.state.hours
        let hoursValue;
        if (!isNaN(hours) && hours > 0) {
            hoursValue = this.state.hours
        }
        else {
            hoursValue = 0
        }
        return {
            companies_name: this.props.company.companies_name,
            hours: hoursValue,
            strike: hoursValue > 0 ? this.state.strike : false
        }
    }

    render() {
        const company = this.props.company
        const index = this.props.index
        const gameForm = this.props.parent
        const name = company.companies_name
        const isCompany = !["MEDITATION", "GYM", "TUTORIAL"].includes(name)
        return (
            <Box className="row col-12 mt-3" borderBottom={0.2}>
                <FormControl className="col-12">
                    <FormGroup row>
                        <Box className="col-md-2" display="flex" bgcolor={!isCompany ? "secondary.main" : null}>
                            <Box className="my-auto mx-auto" >
                                <Typography>{company.companies_name}</Typography>
                            </Box>
                        </Box>
                        <Box className="col-md-3" display="flex" >
                            <Box className="my-auto mx-auto">
                                <TextField disabled={gameForm.state.disableAll} value={this.state.hours} style={{ width: 150 }} id={"game-hours-" + index} name="hours" variant="outlined" size="small"
                                    InputProps={{ endAdornment: <InputAdornment position="end">Hrs</InputAdornment>, }}
                                    onChange={(e) => this.onChangedHours(e.target.value)} />
                            </Box >
                        </Box>
                        <Box className="col-md-2 col-4" display="flex" >
                            <Box className="my-auto mx-auto" >
                                <TextField
                                    disabled
                                    id={BRAIN_ID + index}
                                    label={String(company.brain)}
    
                                    variant="filled"
                                    margin="dense"
                                    style={{ width: 60 }}
                                    inputProps={{ style: { textAlign: 'right' } }}
                                    value={this.state.brain}
                                />
                            </Box>
                        </Box>
                        <Box className="col-md-2 col-4" display="flex" >
                            <Box className="my-auto mx-auto" >
                                <TextField
                                    disabled
                                    id={MUSCLE_ID + index}
                                    label={String(company.muscle)}
                                    variant="filled"
                                    margin="dense"
                                    style={{ width: 60 }}
                                    inputProps={{ style: { textAlign: 'right' } }}
                                    value={this.state.muscle}
                                />
                            </Box>
                        </Box>
                        <Box className="col-md-2 col-4" display="flex" >
                            <Box className="my-auto mx-auto" >
                                <TextField
                                    disabled
                                    id={HEART_ID + index}
                                    label={String(company.heart)}
                                    variant="filled"
                                    margin="dense"
                                    style={{ width: 60 }}
                                    inputProps={{ style: { textAlign: 'right' } }}
                                    value={this.state.heart}
                                />
                            </Box>
                        </Box>
                        {
                            isCompany ?

                                <Box className="col-md-1" display="flex">
                                    <FormControlLabel
                                        className="my-auto mx-auto"
                                        value="end"
                                        control={<Checkbox checked={this.state.strike} color="primary" id={STRIKE_ID + index} onChange={(e) => this.onToggleStrike(e.target.checked)} />}
                                        label="Strike"
                                        labelPlacement="top"
                                        disabled={gameForm.state.disableAll || !this.state.strikeEnabled}
                                    />
                                </Box>
                                : null


                        }

                    </FormGroup>
                </FormControl>

            </Box>
        )
    }
}