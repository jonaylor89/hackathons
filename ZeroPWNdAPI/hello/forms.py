from django import forms

class NameForm(forms.Form):
    url = forms.CharField(label='url', max_length=100)
