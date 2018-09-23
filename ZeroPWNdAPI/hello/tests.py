from django.contrib.auth.models import AnonymousUser, User
from django.test import TestCase, RequestFactory

from .views import index

class SimpleTest(TestCase):
    def setUp(self):
        # Every test needs access to the request factory.
        self.factory = RequestFactory()

    def test_details(self):
        # Create an instance of a GET request.
        request = self.factory.get('/')
        request.user = AnonymousUser()

        # Test my_view() as if it were deployed at /customer/details
        response = index(request)
        self.assertEqual(response.status_code, 200)

    def test_clean(self):
        # Create an instance of a POST request
        request = self.factory.post('/')
        request.user = AnonymousUser()
        request.body = "www.facebook.com"

        response = index(request)
        self.assertEqual(response.content, "[]")

    def test_user_error(self):
        request = self.factory.post('/')
        request.user = AnonymousUser()
        request.body = "wlsrjgnkwjfbnskd"  # Random value

        response = index(request)
        self.assertEqual(response.content, "[]")
