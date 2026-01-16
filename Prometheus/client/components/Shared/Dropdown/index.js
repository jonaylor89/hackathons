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
import _ from 'lodash';
import Radium from 'radium';

const styles = {
	base: {
		userSelect: 'none',
		cursor: 'default',
		fontFamily: '"Segoe UI"',
		':focus': {
			outline: 'none'
		}
	}
}

class Dropdown extends React.Component {
	constructor(props) {
		super(props);
		this.root = null;
		this.dropdownBox = null;
		this.state = {
			activeIndex: 'defaultIndex' in this.props ? this.props.defaultIndex : (React.Children.toArray(this.props.children).length == 1 ? 0 : -1),
			isExpanded: false,
			offset: 0,
			maxHeight: 'auto',
			onChange: typeof this.props.onChange == 'function' ? this.props.onChange : function() {}
		};
		switch(React.Children.toArray(this.props.children).length) {
			case 0:
				setTimeout(this.state.onChange.bind(window, null), 0);
				break;
			case 1:
				setTimeout(this.state.onChange.bind(window, 0), 0);
				break;
		}
	}
	componentDidMount() {
		let offsetTop = this.root.getBoundingClientRect().top - this.state.offset;
		let offsetBottom = window.innerHeight - offsetTop - this.root.getBoundingClientRect().height + this.state.offset;
		this.setState({
			maxHeight: Math.min(offsetTop, offsetBottom) * 0.8 + 'px'
		});
	}
	componentWillReceiveProps(nextProps) {
		if (!_.isEqual(React.Children.toArray(this.props.children), nextProps.children)) {
			this.setState({
				activeIndex: React.Children.toArray(this.props.children).length == 1 ? 0 : -1,
				isExpanded: false
			});
			switch(React.Children.toArray(this.props.children).length) {
				case 0:
					setTimeout(this.state.onChange.bind(window, null), 0);
					break;
				case 1:
					setTimeout(this.state.onChange.bind(window, 0), 0);
					break;
			}
		}
	}
	render() {
		return (
			<div
				ref={root => this.root = root}
				key="wrapper"
				style={[styles.base, {
					display: 'flex',
					alignItems: 'center'
				}]}
			>
				<div
					style={{
						paddingRight: '16px',
						fontSize: 'larger'
					}}
				>
					{this.props.label}
				</div>
				<div
					style={{
						width: this.props.width || '600px',
						minHeight: '38px'
					}}
				>
					<div
						style={{
							background: 'white',
							position: this.state.isExpanded ? 'absolute' : null,
							width: this.props.width || '600px',
							transform: this.state.isExpanded ? 'translateY(-' + this.state.offset + 'px)' : null,
							zIndex: 1
						}}
						onClick={() => this.setState({isExpanded: !this.state.isExpanded})}
						onBlur={() => this.setState({isExpanded: false})}
					>
						<style>{`
							div.dropbox {
								padding: 5px 10px 5px 10px;
								border: #BDBDBD solid 2px;
							}
							div.dropbox:hover {
								border: #9E9E9E solid 2px;
							}
							div.dropbox div.option {
								transform: scale(0);
								height: 0;
							}
							div.dropbox.preview div.option.active {
								transform: scale(1);
							}
							div.dropbox.expanded {
								padding: 5px 0 5px 0;
							}
							div.dropbox.expanded div.option {
								padding: 5px 10px 5px 20px;
							}
							div.dropbox.expanded div.option:hover {
								background: #BDBDBD;
							}
							div.dropbox.expanded div.option.active {
								background: #E1F5FE;
							}
							div.dropbox.expanded div.option.active:hover {
								background: #81D4FA;
							}
						`}</style>
						<div
							tabIndex={'0'}
							ref={r => this.dropdownBox = r}
							key="dropbox"
							style={[styles.base]}
							className={'dropbox ' + (this.state.isExpanded ? 'expanded' : 'preview')}
						>
							<div
								style={{
									display: this.state.isExpanded ? 'none' : 'flex'
								}}
							>
								<div
									style={{
										// This is the preview tag
										flexGrow: 1
									}}
								>
									<div
										style={{
											transform: 'scale(1)',
											transition: 'transform 250ms ease-out, height 250 ease-out',
											height: '22px',
											overflowY: 'hidden'
										}}
										className={this.state.isExpanded ? 'option' : 'active option'}
									>
										{this.state.activeIndex == -1 ? '' : React.Children.toArray(this.props.children)[this.state.activeIndex]}
									</div>
								</div>
								<img
									src={require("./dropdown.svg")}
								/>
							</div>
							<div
								style={{
									// This is the expanded options tag
									flexGrow: 1,
									transform: 'translateY(-2px)',
									display: this.state.isExpanded ? 'block' : 'none',
									maxHeight: this.state.maxHeight,
									overflowY: 'auto'
								}}
							>
								{React.Children.toArray(this.props.children).map((e, i, unused, entry) => (
									<div
										key={i}
										style={{
											transform: 'scale(1)',
											transition: 'transform 250ms ease-out, height 250 ease-out',
											height: '22px',
											overflowY: 'hidden'
										}}
										className={this.state.activeIndex == i ? 'active option' : 'option'}
										ref={r => entry = r}
										onClick={function() {
											if (this.state.isExpanded) {
												entry.scrollIntoView();
												let gap = entry.getBoundingClientRect().top - entry.parentElement.getBoundingClientRect().top;
												entry.parentElement.scrollTop -= parseInt(this.state.maxHeight) / 2 - gap -
													entry.getBoundingClientRect().height;
												this.setState({
													offset: entry.getBoundingClientRect().top - entry.parentElement.getBoundingClientRect().top,
													activeIndex: i
												});
												if (this.state.activeIndex != i) {
													this.state.onChange(i);
												}
											}
										}.bind(this)}
									>
										{e}
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}
}

export default Radium(Dropdown);
