from django import forms


class NameForm(forms.Form):
    url = forms.CharField(label='url yo dawg', max_length=100)
