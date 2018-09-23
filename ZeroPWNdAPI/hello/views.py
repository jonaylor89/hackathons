from django.shortcuts import render
from django.http import HttpResponse

from .models import Greeting

import requests
import json


# Create your views here.
def index(request):
    params = {'apikey': '88a3fcdbe688d5928b05d668797d6b0da729e1f403909e12d2b15ca36ff12a99',
              'resource': 'http://www.virustotal.com'}
    headers = {
        "Accept-Encoding": "gzip, deflate",
        "User-Agent": "ZeroPWNd"
    }

    _ = requests.post('https://www.virustotal.com/vtapi/v2/file/scan',
                      params=params,
                      headers=headers)
    response = requests.get('https://www.virustotal.com/vtapi/v2/file/report',
                            params=params,
                            headers=headers).json()

    print(json.dumps(response))
    return HttpResponse("<pre>" + json.dump(response) + "</pre>")


def db(request):

    greeting = Greeting()
    greeting.save()

    greetings = Greeting.objects.all()

    return render(request, 'db.html', {'greetings': greetings})

