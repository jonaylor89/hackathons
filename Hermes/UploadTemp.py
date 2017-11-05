
import calendar
import time

import time
import requests
import json

from temp_read import read_temperature

from firebase import firebase


firebase_url = 'https://healthhacks2017-ec6bf.firebaseio.com/'

time_hhmmss = time.strftime('%H:%M:%S')

data = {'time':time_hhmmss,'data': read_temperature()}

result = requests.post(firebase_url + '/temperature.json', data=json.dumps(data))
