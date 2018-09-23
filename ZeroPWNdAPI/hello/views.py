from django.shortcuts import render
from django.http import HttpResponse

from .models import Greeting

import requests
import json


# Create your views here.
def index(request):
    params = {'apikey': '88a3fcdbe688d5928b05d668797d6b0da729e1f403909e12d2b15ca36ff12a99',
              'url': 'https://www.facebook.com'}
    headers = {
        "Accept-Encoding": "gzip, deflate",
        "User-Agent": "ZeroPWNd"
    }

    _ = requests.post('https://www.virustotal.com/vtapi/v2/url/scan',
                      data=params)

    params = {'apikey': '88a3fcdbe688d5928b05d668797d6b0da729e1f403909e12d2b15ca36ff12a99',
              'resource': 'https://www.facebook.com'}
    response = requests.post('https://www.virustotal.com/vtapi/v2/url/report',
                             params=params,
                             headers=headers).json()

    print(json.dumps(response))
    response_dict = json.loads(json.dumps(response))
    if response_dict["positives"] == 0:
        return HttpResponse("[]")
    else:
        response_dict = json.loads(response)
        exploits = []

        for k, v in response_dict["scans"]:
            exploits.append(k)

        return HttpResponse(str(exploits))


def db(request):

    greeting = Greeting()
    greeting.save()

    greetings = Greeting.objects.all()

    return render(request, 'db.html', {'greetings': greetings})

