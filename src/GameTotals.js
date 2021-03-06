import React from 'react'
import Typography from '@material-ui/core/Typography'
import { Box, TextField, FormControl, FormGroup, InputAdornment } from '@material-ui/core';


const styles = theme => ({
    textField: {
        color: 'secondary'
    }
});

export default class GameRow extends React.Component {
    
    render() {
        const totals = this.props.totals
        const totalBrain = totals.brain
        const totalMuscle = totals.muscle
        const totalHeart = totals.heart
        const totalHours = totals.hours

        return (
            <Box className="col-12 " px={0} borderBottom={2} borderTop={2}>
                <FormControl className="col-12">
                    <FormGroup row>
                        <Box className="col-md-2" display="flex">
                            <Box className="my-auto mx-auto" >
                                <Typography variant="h5">Totals:</Typography>
                            </Box>
                        </Box>
                        <Box className="col-md-3 col-6" display="flex" >
                            <Box className="my-auto mx-auto">
                                <TextField disabled value={totalHours}  id="game-hours-total" name="hours" variant="outlined" size="small"
                                    InputProps={{ endAdornment: <InputAdornment position="end">Hrs</InputAdornment>, className: styles.textField }}
                                />
                            </Box >
                        </Box>
                        <Box className="col-md-2 col-2" display="flex" >
                            <Box className="my-auto mx-auto" >
                                <TextField
                                    disabled
                                    id="game-brain-total"
                                    variant="filled"
                                    margin="dense"
                                    style={{ width: 60 }}
                                    inputProps={{ style: { textAlign: 'right' } }}
                                    value={totalBrain}
                                />
                            </Box>
                        </Box>
                        <Box className="col-md-2 col-2" display="flex" >
                            <Box className="my-auto mx-auto" >
                                <TextField
                                    disabled
                                    id="game-muscle-total"
                                    variant="filled"
                                    margin="dense"
                                    style={{ width: 60 }}
                                    inputProps={{ style: { textAlign: 'right' } }}
                                    value={totalMuscle}
                                />
                            </Box>
                        </Box>
                        <Box className="col-md-2 col-2" display="flex" >
                            <Box className="my-auto mx-auto" >
                                <TextField
                                    disabled
                                    id="game-heart-total"
                                    variant="filled"
                                    margin="dense"
                                    style={{ width: 60 }}
                                    inputProps={{ style: { textAlign: 'right' } }}
                                    value={totalHeart}
                                />
                            </Box>
                        </Box>
                    </FormGroup>
                </FormControl>
            </Box>
        )
    }
}