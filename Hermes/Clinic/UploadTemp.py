
import sys
import time
import requests
import json

from temp_read import read_temperature

patient_number = sys.argv[1]

firebase_url = 'https://healthhacks2017-ec6bf.firebaseio.com/'

time_hhmmss = time.strftime('%H:%M:%S')

data = {'time':time_hhmmss,
        'temperature': read_temperature(),
        'room_number': patient_number,
        'Age': 9,
        'SpO2': 0.95,
        'HR': 90,
        'Systolic BP': 90}

result = requests.post(firebase_url + '/temperature.json', data=json.dumps(data))
