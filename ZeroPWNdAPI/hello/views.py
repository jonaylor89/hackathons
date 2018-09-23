from django.shortcuts import render
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

from .models import Greeting
from .forms import NameForm

import requests
import json


# Create your views here.
@csrf_exempt
def index(request):

    result = ""

    if request.method == 'POST':

        form = NameForm(request.POST)

        if form.is_valid():
            url = form.cleaned_data["url"]
        else:
            url = request.body.decode()

        print(url)

        params = {'apikey': '88a3fcdbe688d5928b05d668797d6b0da729e1f403909e12d2b15ca36ff12a99',
                    'url': url}
        headers = {
            "Accept-Encoding": "gzip, deflate",
            "User-Agent": "ZeroPWNd"
        }

        _ = requests.post('https://www.virustotal.com/vtapi/v2/url/scan',
                            data=params)

        params = {'apikey': '88a3fcdbe688d5928b05d668797d6b0da729e1f403909e12d2b15ca36ff12a99',
                'resource': url}
        response = requests.post('https://www.virustotal.com/vtapi/v2/url/report',
                                params=params,
                                headers=headers).json()

        print(json.dumps(response))
        response_dict = json.loads(json.dumps(response))

        try:
            if response_dict["positives"] == 0:
                return HttpResponse("[]")
            else:
                response_dict = json.loads(response)
                exploits = []

                for k, v in response_dict["scans"]:
                    exploits.append(k)

                return HttpResponse(str(exploits))
        except:
            return HttpResponse("[invalid]")

    else:
        form = NameForm()

    return render(request, "index.html", {"form": form})


def db(request):

    greeting = Greeting()
    greeting.save()

    greetings = Greeting.objects.all()

    return render(request, 'db.html', {'greetings': greetings})

