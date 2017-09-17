/*
    Copyright (C) 2017 Darren Chan

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
import React from 'react';
import Radium from 'radium';
import PropTypes from 'prop-types';

const styles = {
	base: {
		display: 'flex',
		userSelect: 'none',
		cursor: 'default',
		fontFamily: '"Segoe UI"',
		alignItems: 'center'
	},
	label: {
		paddingRight: '16px',
		fontSize: 'larger'
	},
	input: {
		border: '#BDBDBD solid 2px',
		flexGrow: '1',
		height: '24px',
		padding: '5px 10px',
		':hover': {
			border: '#9E9E9E solid 2px'
		},
		':focus': {
			outline: 'none'
		},
	}
};

class InputBox extends React.Component {
	constructor(props) {
		super(props);
		this.inputBox = null;
	}
	getValue() {
		return this.inputBox.value;
	}
	setValue(str) {
		this.inputBox.value = str;
	}
	render() {
		return (
			<div
				style={styles.base}
			>
				<div
					style={styles.label}
				>
					{this.props.label}
				</div>
				<div
					style={{
						display: 'flex',
						width: this.props.width
					}}
				>
					<input
						ref={r => this.inputBox = r}
						onChange={() => this.props.onChange(this.getValue())}
						style={styles.input}
						placeholder={this.props.placeholder}
					></input>
				</div>
			</div>
		)
	}
}

InputBox.defaultProps = {
	onChange: function() {
	},
	placeholder: null,
	width: '600px'
};

InputBox.propTypes = {
	onChange: PropTypes.func,
	placeholder: PropTypes.string,
	width: PropTypes.string
};

export default Radium(InputBox);
