
import urllib2
import json

from temp_read import read_temperature

url = 'https://healthhacks2017-ec6bf.firebaseio.com/'

postdata = {
    'date' : str(calendar.timegm(time.gmtime())),
    'temp' : str(read_temperature())
}

req = urllib2.Request(url)
req.add_header('Content-Type', 'application/json')
data = json.dump(postdata)

response = urllib2.urlopen(req, data)
