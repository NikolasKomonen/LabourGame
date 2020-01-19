import React, {Component} from 'react'
import { Box, ButtonGroup, Button, withStyles } from '@material-ui/core'

const styles = withStyles({
    availablePointsButtons: {
        border: 'solid white 1px',
        color: 'white',
    }
    
});

class AvailablePoints extends Component {
    constructor(props) {
        super(props)
        this.state = {
            points: 0
        }
    }

    decrementPoints() {
        this.props.parent.decrementAvailable(this.props.part)
    }

    incrementPoints() {
        this.props.parent.incrementAvailable(this.props.part)
    }

    render() {
        const available = this.props.available
        const disable = this.props.disable
        
        return (
            <Box className="col-4" display="flex" justifyContent="center">
                <ButtonGroup size="large" aria-label="small outlined button group">
                    <Button hidden={this.props.week !== 1} className={this.props.classes.availablePointsButtons}
                        onClick={() => {this.decrementPoints()}} disabled={disable}>-</Button>
                    <Button disabled style={{ color: available >= 0 ? 'white' : '#f56c6c', border: 'solid white 1px' }}>{available}</Button>
                    <Button hidden={this.props.week !== 1} className={this.props.classes.availablePointsButtons}
                        onClick={() => {this.incrementPoints()}} disabled={disable}>+</Button>
                </ButtonGroup>
            </Box>
        )
    }
}

export default styles(AvailablePoints)