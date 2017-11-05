
from urllib.request import urlopen
from urllib.request import Request
import json
import calendar
import time

from temp_read import read_temperature
import config

secret = config.secret()
url = 'https://healthhacks2017-ec6bf.firebaseio.com/users' + secret

postdata = {
    'date' : str(calendar.timegm(time.gmtime())).encode('utf-8'),
    'temp' : str(read_temperature().encode('utf-8'))
}

req = Request(url)
req.add_header('Content-Type', 'application/json')
data = json.dumps(postdata)

response = urlopen(req, data)
