import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import {
    ProgressCircle,
    Text
} from 'react-desktop/windows';
// The main wrapper function for encapsulating different 'fragments'
import Carousel from './components/Shared/Carousel';

import WelcomePage from './components/WelcomePage';
import SpeechAi from './components/SpeechAi';

const voices = [];

class ConfigStore {
	constructor(callback) {
		this.config = [];
  }
	set(key, value) {
		this.config[key] = value;
	}
	get(key) {
		return this.config[key];
	}
	apply(newConfig) {
		newConfig = _.merge(this.config, newConfig);
	}
	async loadRemoteConfig(/*...urls*/) {
		for (let url of arguments) {
			try {
				this.apply(await this._fetchConfig(url));
			} catch (err) {
				console.error('Error while obtaining JSON config from ' + url, err);
			}
		}
	}
	async _fetchConfig(url) {
		return new Promise((resolve, reject) => {
			var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onload = function() {
        resolve(JSON.parse(xhr.responseText));
      };
      xhr.send();
		});
	}
}

class NomadArrayAdapter extends Carousel.ArrayAdapter {
	constructor() {
		super();
		this.stage = -1;
		this.configStore = new ConfigStore();
	}
	getNext(previousCallbackProps) {
		switch(++this.stage) {
			case 0:
				return <WelcomePage />;
			case 1: {
        let rec = () => {
          let _voices = speechSynthesis.getVoices();
          if (_voices.length == 0) {
            setTimeout(rec, 200);
          } else {
            voices.push(..._voices);
            Object.freeze(voices);
            this.parent.next();
          }
        };
				this.configStore.loadRemoteConfig(
					'https://raw.githubusercontent.com/jonaylor89/FAQ-Bot/master/FAQs.json'
				).then(rec);
				return (
					<div
						style={{
							display: 'flex',
							alignItems: 'center'
						}}
					>
						<ProgressCircle
							size={80}
						/>
						<Text
							padding="0px 24px 0px 24px"
							height={60}
							verticalAlignment="center"
						>
							<span
								style={{
									fontSize: 'x-large'
								}}
							>
								Fetching database...
							</span>
						</Text>
					</div>
				);
			}
			case 2: {
				return <SpeechAi
          voices={voices}
          FAQs={this.configStore.config}
        />
			}
			default:
				return null;
		}
	}
}

ReactDOM.render((
	<Carousel
		adapter={new NomadArrayAdapter()}
	>
	</Carousel>
), document.querySelector('#react-root'));
