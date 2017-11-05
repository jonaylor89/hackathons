
from urllib.request import urlopen
from urllib.request import Request
import json
import calendar
import time

from temp_read import read_temperature

url = 'https://healthhacks2017-ec6bf.firebaseio.com/'

postdata = {
    'date' : bytes(calendar.timegm(time.gmtime()), 'utf-8'),
    'temp' : bytes(read_temperature(), 'utf-8')
}

req = Request(url)
req.add_header('Content-Type', 'application/json')
data = json.dumps(postdata)

response = urlopen(req, data)
