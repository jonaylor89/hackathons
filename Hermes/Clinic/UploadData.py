
import sys
import time
import requests
import json

from temp_read import read_temperature

room_number = sys.argv[1]
Age = sys.argv[2]

firebase_url = 'https://healthhacks2017-ec6bf.firebaseio.com/Clinic/'

time_hhmmss = time.strftime('%H:%M:%S')

data = {'time':time_hhmmss,
        'age': int(Age),
        'sex': 'Male',
        'temperature': read_temperature(),
        'SpO2': 0.95,
        'HR': 90,
        'systolic BP': 90}

result = requests.post(firebase_url + 'Room_' + room_number + '.json', data=json.dumps(data))
