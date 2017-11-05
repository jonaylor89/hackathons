
import sys
import time
import requests
import json

from Client/temp_read import read_temperature

patient_number = sys.argv[1]

firebase_url = 'https://healthhacks2017-ec6bf.firebaseio.com/'

time_hhmmss = time.strftime('%H:%M:%S')

data = {'time':time_hhmmss,'data': read_temperature(), 'room_number': patient_number}

result = requests.post(firebase_url + '/temperature.json', data=json.dumps(data))
