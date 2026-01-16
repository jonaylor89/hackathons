from django import forms


class NameForm(forms.Form):
    url = forms.CharField(label='URL to inspect', max_length=100)
